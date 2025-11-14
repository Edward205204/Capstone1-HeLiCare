export const createPostSchema = {
  title: {
    notEmpty: {
      errorMessage: 'Title is required'
    },
    isLength: {
      options: { min: 1, max: 500 },
      errorMessage: 'Title must be between 1 and 500 characters'
    },
    trim: true
  },
  content: {
    notEmpty: {
      errorMessage: 'Content is required'
    },
    isLength: {
      options: { min: 1, max: 10000 },
      errorMessage: 'Content must be between 1 and 10000 characters'
    },
    trim: true
  },
  residentIds: {
    optional: true,
    isArray: {
      errorMessage: 'residentIds must be an array'
    }
  },
  tags: {
    optional: true,
    isArray: {
      errorMessage: 'tags must be an array'
    }
  },
  imageUrls: {
    optional: true,
    isArray: {
      errorMessage: 'imageUrls must be an array'
    }
  },
  visibility: {
    optional: true,
    isIn: {
      options: [['STAFF_ONLY', 'STAFF_AND_FAMILY_OF_RESIDENTS', 'PUBLIC']],
      errorMessage: 'Visibility must be STAFF_ONLY, STAFF_AND_FAMILY_OF_RESIDENTS, or PUBLIC'
    }
  }
}

export const updatePostSchema = {
  title: {
    optional: true,
    isLength: {
      options: { min: 1, max: 500 },
      errorMessage: 'Title must be between 1 and 500 characters'
    },
    trim: true
  },
  content: {
    optional: true,
    isLength: {
      options: { min: 1, max: 10000 },
      errorMessage: 'Content must be between 1 and 10000 characters'
    },
    trim: true
  },
  residentIds: {
    optional: true,
    isArray: {
      errorMessage: 'residentIds must be an array'
    }
  },
  tags: {
    optional: true,
    isArray: {
      errorMessage: 'tags must be an array'
    }
  },
  imageUrls: {
    optional: true,
    isArray: {
      errorMessage: 'imageUrls must be an array'
    }
  },
  visibility: {
    optional: true,
    isIn: {
      options: [['STAFF_ONLY', 'STAFF_AND_FAMILY_OF_RESIDENTS', 'PUBLIC']],
      errorMessage: 'Visibility must be STAFF_ONLY, STAFF_AND_FAMILY_OF_RESIDENTS, or PUBLIC'
    }
  }
}

export const addCommentSchema = {
  content: {
    notEmpty: {
      errorMessage: 'Comment content is required'
    },
    isLength: {
      options: { min: 1, max: 1000 },
      errorMessage: 'Comment must be between 1 and 1000 characters'
    },
    trim: true
  }
}

