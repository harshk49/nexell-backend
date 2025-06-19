import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Define role enum values
export enum OrgRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

// Define member interface
export interface IOrgMember {
  user: mongoose.Types.ObjectId;
  role: OrgRole;
  joinedAt: Date;
}

// Define org member schema
const orgMemberSchema = new Schema<IOrgMember>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  role: {
    type: String,
    enum: Object.values(OrgRole),
    default: OrgRole.MEMBER,
    required: [true, 'Role is required'],
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

// Define organization interface
export interface IOrganization extends Document {
  name: string;
  description?: string;
  inviteCode: string;
  createdBy: mongoose.Types.ObjectId;
  members: IOrgMember[];
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  generateNewInviteCode: () => Promise<string>;
  isUserMember: (userId: string) => boolean;
  getUserRole: (userId: string) => OrgRole | null;
  hasAdmin: () => boolean;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Organization description cannot be more than 500 characters'],
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true, // Index for faster lookups by invite code
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true, // Index for faster lookups by creator
    },
    members: [orgMemberSchema],
    settings: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create compound index for optimizing member lookups
organizationSchema.index({ 'members.user': 1 });

// Method to generate a new unique invite code
organizationSchema.methods.generateNewInviteCode = async function (): Promise<string> {
  // Generate a random 8-character alphanumeric invite code
  const generateCode = () => {
    return crypto.randomBytes(4).toString('hex');
  };

  // Ensure code uniqueness
  let code = generateCode();
  let codeExists = await mongoose
    .model<IOrganization>('Organization')
    .findOne({ inviteCode: code });

  // If code already exists, generate a new one
  while (codeExists) {
    code = generateCode();
    codeExists = await mongoose.model<IOrganization>('Organization').findOne({ inviteCode: code });
  }

  // Set the new invite code
  this.inviteCode = code;
  return code;
};

// Method to check if a user is a member of the organization
organizationSchema.methods.isUserMember = function (userId: string): boolean {
  return this.members.some((member: IOrgMember) => member.user.toString() === userId);
};

// Method to get a user's role in the organization
organizationSchema.methods.getUserRole = function (userId: string): OrgRole | null {
  const member = this.members.find((member: IOrgMember) => member.user.toString() === userId);
  return member ? member.role : null;
};

// Method to check if there's at least one admin in the organization
organizationSchema.methods.hasAdmin = function (): boolean {
  return this.members.some((member: IOrgMember) => member.role === OrgRole.ADMIN);
};

// Pre-save hook to ensure the creator is added as an admin if not already present
organizationSchema.pre<IOrganization>('save', async function (next) {
  // If this is a new organization or members array is empty
  if (this.isNew || this.members.length === 0) {
    this.members = [
      {
        user: this.createdBy,
        role: OrgRole.ADMIN,
        joinedAt: new Date(),
      },
    ];
  }

  // If this is a new organization, generate invite code
  if (this.isNew && !this.inviteCode) {
    await this.generateNewInviteCode();
  }

  next();
});

// Create Mongoose model
const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;
