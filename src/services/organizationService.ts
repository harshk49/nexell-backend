import mongoose from 'mongoose';
import Organization, { IOrganization, OrgRole, IOrgMember } from '../models/Organization';
import User from '../models/User';
import { AppError } from '../utils/AppError';

interface OrganizationInput {
  name: string;
  description?: string;
}

interface OrganizationsQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface InviteResult {
  organization: IOrganization;
  inviteCode: string;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(
    userId: string,
    orgInput: OrganizationInput
  ): Promise<IOrganization> {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create organization
      const organization = await Organization.create(
        [
          {
            ...orgInput,
            createdBy: userId,
            members: [{ user: userId, role: OrgRole.ADMIN, joinedAt: new Date() }],
          },
        ],
        { session }
      );

      // Generate invite code for the organization
      await organization[0].generateNewInviteCode();
      await organization[0].save({ session });

      // Add organization to user's organizations
      const userOrgs = [
        ...(user.organizations || []),
        organization[0]._id,
      ] as mongoose.Types.ObjectId[];

      // If this is the user's first org, set as default
      if (!user.defaultOrganization && userOrgs.length === 1) {
        user.defaultOrganization = organization[0]._id as mongoose.Types.ObjectId;
      }

      user.organizations = userOrgs;
      await user.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      return organization[0];
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get an organization by ID
   */
  static async getOrganizationById(orgId: string, userId: string): Promise<IOrganization> {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if user is a member of the organization
    if (!organization.isUserMember(userId)) {
      throw new AppError('You do not have access to this organization', 403);
    }

    return organization;
  }

  /**
   * Get all organizations for a user
   */
  static async getUserOrganizations(
    userId: string,
    options: OrganizationsQueryOptions = {}
  ): Promise<{
    organizations: IOrganization[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10, search, sortBy = 'name', sortDirection = 'asc' } = options;

    const skip = (page - 1) * limit;

    // Build filter to find orgs where user is a member
    const filter: any = {
      'members.user': userId,
    };

    // Add search filter if specified
    if (search) {
      filter.name = new RegExp(search, 'i');
    }

    // Count total organizations
    const totalCount = await Organization.countDocuments(filter);

    // Build sort object
    const sort: Record<string, any> = {};
    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;

    // Query organizations
    const organizations = await Organization.find(filter).sort(sort).skip(skip).limit(limit);

    return {
      organizations,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    orgId: string,
    userId: string,
    updates: Partial<OrganizationInput>
  ): Promise<IOrganization> {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if user is an admin of the organization
    if (organization.getUserRole(userId) !== OrgRole.ADMIN) {
      throw new AppError('Only admins can update organization details', 403);
    }

    // Update organization
    Object.assign(organization, updates);
    await organization.save();

    return organization;
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(orgId: string, userId: string): Promise<void> {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if user is an admin of the organization
    if (organization.getUserRole(userId) !== OrgRole.ADMIN) {
      throw new AppError('Only admins can delete an organization', 403);
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all users in the organization
      const userIds = organization.members.map((member: IOrgMember) => member.user);

      // Update all users to remove this organization from their list
      await User.updateMany(
        { _id: { $in: userIds } },
        {
          $pull: { organizations: orgId },
          $unset: { defaultOrganization: 1 },
        },
        { session }
      );

      // Update default organization for users who had this one as default
      const usersToUpdate = await User.find({
        defaultOrganization: orgId,
      });

      // For each user, set their default org to another org they belong to, if any
      for (const user of usersToUpdate) {
        // Get user's orgs excluding the one being deleted
        const remainingOrgs = user.organizations.filter(
          (org: mongoose.Types.ObjectId) => org.toString() !== orgId
        );

        // Set default org to first remaining org, if any
        if (remainingOrgs.length > 0) {
          user.defaultOrganization = remainingOrgs[0];
          await user.save({ session });
        }
      }

      // Delete the organization
      await Organization.findByIdAndDelete(orgId, { session });

      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate a new invite code for an organization
   */
  static async generateInviteCode(orgId: string, userId: string): Promise<InviteResult> {
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if user is an admin of the organization
    if (organization.getUserRole(userId) !== OrgRole.ADMIN) {
      throw new AppError('Only admins can generate invite codes', 403);
    }

    // Generate new invite code
    const inviteCode = await organization.generateNewInviteCode();
    await organization.save();

    return { organization, inviteCode };
  }

  /**
   * Join an organization using an invite code
   */
  static async joinWithInviteCode(inviteCode: string, userId: string): Promise<IOrganization> {
    const organization = await Organization.findOne({ inviteCode });

    if (!organization) {
      throw new AppError('Invalid or expired invite code', 404);
    }

    // Check if user is already a member
    if (organization.isUserMember(userId)) {
      throw new AppError('You are already a member of this organization', 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Add user to organization's members
      organization.members.push({
        user: userId as unknown as mongoose.Types.ObjectId,
        role: OrgRole.MEMBER,
        joinedAt: new Date(),
      });

      await organization.save({ session });

      // Add organization to user's organizations
      const userOrgs = [
        ...(user.organizations || []),
        organization._id,
      ] as mongoose.Types.ObjectId[];

      // If this is the user's first org, set as default
      if (!user.defaultOrganization) {
        user.defaultOrganization = organization._id as mongoose.Types.ObjectId;
      }

      user.organizations = userOrgs;
      await user.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      return organization;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update user role in an organization
   */
  static async updateMemberRole(
    orgId: string,
    adminUserId: string,
    targetUserId: string,
    newRole: OrgRole
  ): Promise<IOrganization> {
    // Get organization
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if the acting user is an admin
    if (organization.getUserRole(adminUserId) !== OrgRole.ADMIN) {
      throw new AppError('Only admins can update member roles', 403);
    }

    // Find the target member
    const targetMemberIndex = organization.members.findIndex(
      (m: IOrgMember) => m.user.toString() === targetUserId
    );

    if (targetMemberIndex === -1) {
      throw new AppError('User is not a member of this organization', 404);
    }

    // Prevent last admin from being demoted
    if (
      organization.members[targetMemberIndex].role === OrgRole.ADMIN &&
      newRole !== OrgRole.ADMIN &&
      organization.members.filter((m: IOrgMember) => m.role === OrgRole.ADMIN).length <= 1
    ) {
      throw new AppError('Cannot demote the last admin of the organization', 400);
    }

    // Update member role
    organization.members[targetMemberIndex].role = newRole;
    await organization.save();

    return organization;
  }

  /**
   * Remove a member from an organization
   */
  static async removeMember(
    orgId: string,
    adminUserId: string,
    targetUserId: string
  ): Promise<IOrganization> {
    // Get organization
    const organization = await Organization.findById(orgId);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if the requesting user is an admin or the member removing themselves
    const isAdmin = organization.getUserRole(adminUserId) === OrgRole.ADMIN;
    const isSelf = adminUserId === targetUserId;

    if (!isAdmin && !isSelf) {
      throw new AppError('Only admins can remove members', 403);
    }

    // Find the target member
    const targetMemberIndex = organization.members.findIndex(
      (m: IOrgMember) => m.user.toString() === targetUserId
    );

    if (targetMemberIndex === -1) {
      throw new AppError('User is not a member of this organization', 404);
    }

    // Prevent removing the last admin
    if (
      organization.members[targetMemberIndex].role === OrgRole.ADMIN &&
      organization.members.filter((m: IOrgMember) => m.role === OrgRole.ADMIN).length <= 1
    ) {
      throw new AppError(
        'Cannot remove the last admin. Promote another member to admin first',
        400
      );
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Remove member from organization
      organization.members.splice(targetMemberIndex, 1);
      await organization.save({ session });

      // Remove organization from user's list
      const user = await User.findById(targetUserId);

      if (user) {
        user.organizations = user.organizations.filter(
          (org: mongoose.Types.ObjectId) => org.toString() !== orgId
        );

        // Update default organization if needed
        if (user.defaultOrganization?.toString() === orgId) {
          user.defaultOrganization =
            user.organizations.length > 0 ? user.organizations[0] : undefined;
        }

        await user.save({ session });
      }

      // Commit the transaction
      await session.commitTransaction();

      return organization;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
