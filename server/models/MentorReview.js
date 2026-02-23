import mongoose from 'mongoose';

const mentorReviewSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one review per user per mentor
mentorReviewSchema.index({ mentorId: 1, userId: 1 }, { unique: true });

export default mongoose.model('MentorReview', mentorReviewSchema);
