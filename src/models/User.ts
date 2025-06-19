import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'member';
  organizations: mongoose.Types.ObjectId[];
  defaultOrganization?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  matchPassword(enteredPassword: string): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password in query results
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    organizations: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],
    defaultOrganization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    active: {
      type: Boolean,
      default: true,
      select: false, // Don't show active status in query results
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Middleware: Hash the password before save
userSchema.pre<IUser>('save', async function (next) {
  // Only hash password if it's modified (or new)
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // If it's a password change (not a new user), update passwordChangedAt
    if (this.isModified('password') && !this.isNew) {
      this.passwordChangedAt = new Date(Date.now() - 1000); // Subtract 1 second to ensure token is created after password change
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Query middleware: Don't show inactive users
userSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Method: Compare entered password with user's hashed password
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Check if password was changed after JWT token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Method: Generate and hash password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token expiry (10 minutes)
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Return unhashed token (to be sent via email)
  return resetToken;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
