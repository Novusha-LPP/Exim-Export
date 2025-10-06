import Joi from 'joi';

// Schema for individual document with file upload tracking
const documentUploadSchema = Joi.object({
  uploaded: Joi.boolean().default(false),
  files: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      size: Joi.number().required(),
      url: Joi.string().uri().required(),
      uploadedAt: Joi.date().iso()
    })
  ).default([])
}).default({ uploaded: false, files: [] });

const directorySchema = Joi.object({
  organization: Joi.string().required().max(255),
  alias: Joi.string().required().max(50),
  approvalStatus: Joi.string().valid('Pending', 'Approved', 'Rejected').default('Pending'),
  
  generalInfo: Joi.object({
    entityType: Joi.string().valid('Company', 'Partnership', 'LLP', 'Proprietorship').required(),
    companyName: Joi.string().required().max(255),
    msmeRegistered: Joi.boolean().default(false)
  }).required(),
  
  address: Joi.object({
    addressLine: Joi.string().required().max(500),
    postalCode: Joi.string().required().max(10),
    telephone: Joi.string().allow('').max(50),
    fax: Joi.string().allow('').max(50),
    email: Joi.string().email().allow('').max(255)
  }).required(),
  
  registrationDetails: Joi.object({
    binNo: Joi.string().allow('').max(50),
    ieCode: Joi.string().required().max(20),
    panNo: Joi.string().required().max(10),
    gstinMainBranch: Joi.string().allow('').max(15),
    gstinBranchCodeFree: Joi.string().allow('').max(15),
    gstinBranchCode15: Joi.string().allow('').max(15)
  }).required(),
  
  // Updated kycDocuments schema to handle nested objects
  kycDocuments: Joi.object({
    certificateOfIncorporation: documentUploadSchema,
    memorandumOfAssociation: documentUploadSchema,
    articlesOfAssociation: documentUploadSchema,
    powerOfAttorney: documentUploadSchema,
    copyOfPanAllotment: documentUploadSchema,
    copyOfTelephoneBill: documentUploadSchema,
    gstRegistrationCopy: documentUploadSchema,
    balanceSheet: documentUploadSchema
  }).default({}),
  
  branchInfo: Joi.array().items(
    Joi.object({
      branchCode: Joi.string().required().max(20),
      address: Joi.string().required().max(500),
      city: Joi.string().required().max(100),
      state: Joi.string().required().max(100),
      postalCode: Joi.string().required().max(10),
      country: Joi.string().required().max(100).default('India')
    })
  ).default([]),
  
  aeoDetails: Joi.object({
    aeoCode: Joi.string().allow('').max(50),
    aeoCountry: Joi.string().max(100).default('India'),
    aeoRole: Joi.string().allow('').max(10)
  }).default({}),
  
  billingCurrency: Joi.object({
    defaultCurrency: Joi.string().max(3).default('INR'),
    defaultBillTypes: Joi.array().items(Joi.string()).default([])
  }).default({}),
  
  authorizedSignatory: Joi.array().items(
    Joi.object({
      name: Joi.string().allow('').max(255),
      designation: Joi.string().allow('').max(100),
      mobile: Joi.string().allow('').max(15),
      email: Joi.string().email().allow('').max(255)
    })
  ).default([]),
  
  customHouse: Joi.array().items(
    Joi.object({
      name: Joi.string().allow('').max(255),
      location: Joi.string().allow('').max(255),
      code: Joi.string().allow('').max(50),
      linkedStatus: Joi.string().valid('Linked', 'Not Linked').default('Not Linked')
    })
  ).default([]),
  
  // Updated accountCreditInfo schema to handle empty strings
  accountCreditInfo: Joi.object({
    creditLimit: Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().empty('').default(0)
    ).default(0),
    unlimitedEnabled: Joi.boolean().default(false),
    creditPeriod: Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().empty('').default(0)
    ).default(0)
  }).default({}),
  
  bankDetails: Joi.array().items(
    Joi.object({
      entityName: Joi.string().required().max(255),
      branchLocation: Joi.string().required().max(255),
      accountNumber: Joi.string().required().max(50),
      adCode: Joi.string().required().max(20),
      isDefault: Joi.boolean().default(false)
    })
  ).default([]),
  
  affiliateBranches: Joi.array().items(
    Joi.object({
      branchCode: Joi.string().allow('').max(20),
      branchName: Joi.string().allow('').max(255)
    })
  ).default([]),
  
  notes: Joi.string().allow('').max(1000)
});

export const validateDirectory = (req, res, next) => {
  const { error, value } = directorySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true // This will convert empty strings to default values
  });

  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // Convert empty strings to numbers for credit info
  if (value.accountCreditInfo) {
    if (value.accountCreditInfo.creditLimit === '' || value.accountCreditInfo.creditLimit === null) {
      value.accountCreditInfo.creditLimit = 0;
    }
    if (value.accountCreditInfo.creditPeriod === '' || value.accountCreditInfo.creditPeriod === null) {
      value.accountCreditInfo.creditPeriod = 0;
    }
  }

  req.body = value;
  next();
};
