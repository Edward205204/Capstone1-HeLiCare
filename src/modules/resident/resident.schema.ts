export const getApplicantSchema = {
  optional: true,
  trim: true,
  isIn: {
    options: [['pending', 'approved', 'rejected']],
    errorMessage: 'Status must be pending, approved, or rejected'
  }
}
