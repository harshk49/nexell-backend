# Organization Integration

This document outlines how organizational context is integrated throughout the Nexell backend system.

## Overview

The organization system allows users to:

- Create organizations and invite members
- Share resources (notes, folders, tasks) within organizations
- Assign different access levels to members
- Switch between personal context and organization contexts

## Data Model

### Organization Schema

The Organization entity has the following fields:

- **name**: String (required) - The name of the organization
- **description**: String - Organization description
- **inviteCode**: String (unique) - Code used for inviting new members
- **createdBy**: User ID (required) - The organization creator
- **members**: Array of objects:
  - **user**: User ID - The member's user ID
  - **role**: Enum - Role within the organization (admin, member, viewer)
  - **joinedAt**: Date - When the user joined
- **settings**: Map - Organization settings
- **timestamps**: createdAt, updatedAt - Automatically managed by Mongoose

### User Schema Updates

The User model has been extended to include:

- **organizations**: Array of Organization IDs - Organizations the user belongs to
- **defaultOrganization**: Organization ID - The user's default organization context

## Organization Context

### Request Context

Organization context is managed through a middleware chain:

1. **extractOrg Middleware**:

   - Extracts organization ID from three possible sources:
     - Request header: `x-organization-id`
     - Query parameter: `orgId`
     - Route parameter: `orgId`
   - Verifies that the organization exists
   - Verifies that the user has access to the organization
   - Attaches the organization and user's role to the request object

2. **requireOrg Middleware**:

   - Ensures that an organization context is present
   - Used for routes that must have an organization context

3. **requireOrgRole Middleware**:
   - Ensures the user has specific role(s) within the organization
   - Example: `requireOrgRole([OrgRole.ADMIN])`

## Resource Scoping

All resources (Notes, Tasks, Folders) have been updated to include organization context:

1. **Data Model Updates**:

   - Added `organization` field to Notes, Tasks, and Folders schemas
   - Updated indexes to optimize organization-based queries

2. **Service Layer Updates**:

   - All CRUD operations accept optional organization context
   - Queries respect organization boundaries
   - For organization resources, permission is based on organization membership and roles

3. **Access Patterns**:
   - Personal resources: `user: userId, organization: null`
   - Organization resources: `organization: orgId`
   - When in organization context, services return both personal and organization resources

## Organization Membership

### Roles and Permissions

1. **Admin Role**:

   - Full control over organization
   - Can invite/remove members
   - Can change member roles
   - Can delete the organization
   - Cannot be removed if they are the last admin

2. **Member Role**:

   - Can create and edit resources
   - Can view all organization resources
   - Cannot manage members or organization settings

3. **Viewer Role**:
   - Can view organization resources
   - Cannot create or edit resources

### Invite Flow

1. **Generating Invite Code**:

   - Organization admins can generate a unique invite code
   - Codes are cryptographically secure and collision-resistant
   - Codes can be regenerated to revoke access

2. **Joining an Organization**:
   - Users enter invite code to join
   - System verifies code validity and adds user as member with default role

## Edge Cases and Safety Mechanisms

1. **Orphaned Organizations Prevention**:

   - Cannot remove or demote the last admin of an organization
   - System checks ensure at least one admin remains

2. **Resource Ownership**:
   - Resources created in organization context belong to the organization
   - Personal resources remain personal unless explicitly shared
   - When a user leaves an organization, their personal resources remain theirs

## Implementation Details

1. **Middleware Path**:

   - `src/middleware/orgMiddleware.ts` contains all organization context handling

2. **Request Flow**:
   - Extract organization context (if any)
   - Verify user membership and permissions
   - Execute controller logic with organization context
   - Service layer applies organization-based filtering
