import { z } from "zod";

export const cctvStatusSchema = z.enum(["none", "partial", "verified"]);
export const incidentSeveritySchema = z.enum(["low", "medium", "high"]);
export const incidentStatusSchema = z.enum([
  "open",
  "triaged",
  "in_progress",
  "resolved"
]);

const nonEmptyString = z.string().trim().min(1);
const optionalStringList = z.array(nonEmptyString).default([]);
const mediaAssetUrlSchema = z.string().trim().url().max(4_096);
const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value;
};

export const createBuildingSchema = z.object({
  name: nonEmptyString,
  address: nonEmptyString,
  county: nonEmptyString,
  cctvStatus: cctvStatusSchema.default("none"),
  units: z.number().int().positive().optional(),
  houseNumbers: z.array(nonEmptyString.max(24)).min(1).max(1000).optional(),
  media: z.object({
    imageUrls: optionalStringList,
    videoUrls: optionalStringList,
    floorPlanUrl: z.string().trim().url().optional(),
    neighborhoodNotes: z.string().trim().optional()
  })
});

export const buildingMediaUpdateSchema = z.object({
  imageUrls: z.array(mediaAssetUrlSchema).max(6).default([])
});

export const deleteBuildingSchema = z.object({
  confirmBuildingId: nonEmptyString.max(80).optional(),
  confirmationText: z.literal("DELETE").optional()
});

export const landlordAddBuildingHousesSchema = z.object({
  houseNumbers: z.array(nonEmptyString.max(24)).min(1).max(1000)
});

export const landlordRemoveBuildingHouseSchema = z.object({
  confirmHouseNumber: nonEmptyString.max(24).optional(),
  confirmationText: z.literal("REMOVE").optional(),
  note: z.string().trim().max(280).optional()
});

export const landlordWriteOffRoomBalanceSchema = z.object({
  reason: z.string().trim().max(280).optional()
});

export const moveOutSettlementActionSchema = z.enum([
  "collect_before_move_out",
  "write_off",
  "transfer_to_resident_debt"
]);

export const landlordRemoveBuildingUserSchema = z.object({
  confirmUserId: nonEmptyString.max(120).optional(),
  confirmationText: z.literal("REMOVE").optional(),
  note: z.string().trim().max(280).optional(),
  settlementAction: moveOutSettlementActionSchema,
  settlementReason: z.string().trim().max(280).optional(),
  confirmedOutstandingKsh: z.number().int().min(0).max(5_000_000).optional()
});

export const adminRevokeLandlordSchema = z.object({
  confirmUserId: nonEmptyString.max(120).optional(),
  confirmationText: z.literal("REVOKE").optional(),
  note: z.string().trim().max(500).optional()
});

export const adminAssignBuildingLandlordSchema = z.object({
  identifier: z.string().trim().min(3).max(160)
});

export const createIncidentSchema = z.object({
  title: nonEmptyString,
  details: nonEmptyString,
  severity: incidentSeveritySchema.default("medium")
});

export const resolveIncidentSchema = z.object({
  resolutionNotes: z.string().trim().min(1).optional()
});

export const updateIncidentStatusSchema = z.object({
  status: incidentStatusSchema,
  resolutionNotes: z.string().trim().min(1).max(500).optional()
});

export const createVacancySnapshotSchema = z.object({
  movedOutAt: z.string().datetime(),
  beforeImageUrls: optionalStringList,
  afterImageUrls: optionalStringList,
  videoUrls: optionalStringList,
  structuralChanges: optionalStringList,
  damages: optionalStringList,
  repairs: optionalStringList,
  notes: z.string().trim().optional()
});

export const wifiPackageIdSchema = z.enum([
  "hour_1",
  "hour_3",
  "hour_8",
  "day_24"
]);

export const utilityBillingModeSchema = z.enum([
  "metered",
  "fixed_charge",
  "combined_charge",
  "disabled"
]);

export const wifiAccessModeSchema = z.enum([
  "disabled",
  "voucher_packages"
]);

export const kenyaPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+254|254|0)(?:7\d{8}|1\d{8})$/, {
    message: "Use a valid Kenyan number (e.g. 07..., 01..., or +254...)"
  });

export const createWifiPaymentSchema = z.object({
  buildingId: nonEmptyString,
  packageId: wifiPackageIdSchema,
  phoneNumber: kenyaPhoneSchema
});

export const confirmWifiPaymentSchema = z.object({
  status: z.enum(["success", "failed"]),
  providerReference: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional()
});

export const updateWifiPackageSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    profile: z.string().trim().min(1).max(100).optional(),
    hours: z.number().int().min(1).max(72).optional(),
    priceKsh: z.number().int().min(1).max(10_000).optional(),
    enabled: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one package field to update."
  });

export const userReportTypeSchema = z.enum([
  "room_issue",
  "stolen_item",
  "general"
]);

const optionalDateTimeSchema = z.string().datetime().optional();

export const createUserReportSchema = z
  .object({
    type: userReportTypeSchema,
    title: nonEmptyString.max(100),
    details: z.string().trim().min(5).max(1500),
    stolenItem: z.string().trim().max(120).optional(),
    incidentWindowStartAt: optionalDateTimeSchema,
    incidentWindowEndAt: optionalDateTimeSchema,
    incidentLocation: z.string().trim().max(120).optional(),
    evidenceAttachments: z.array(mediaAssetUrlSchema).max(8).default([]),
    caseReference: z.string().trim().max(80).optional()
  })
  .superRefine((value, context) => {
    if (value.type === "stolen_item") {
      if (!value.stolenItem) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stolenItem"],
          message: "Stolen item is required when reporting theft."
        });
      }

      if (!value.incidentWindowStartAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incidentWindowStartAt"],
          message: "Incident start time is required for theft workflow."
        });
      }

      if (!value.incidentWindowEndAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incidentWindowEndAt"],
          message: "Incident end time is required for theft workflow."
        });
      }

      if (!value.incidentLocation) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incidentLocation"],
          message: "Incident location is required for theft workflow."
        });
      }
    }

    if (value.incidentWindowStartAt && value.incidentWindowEndAt) {
      const startMs = new Date(value.incidentWindowStartAt).getTime();
      const endMs = new Date(value.incidentWindowEndAt).getTime();

      if (endMs < startMs) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incidentWindowEndAt"],
          message: "Incident end time must be after start time."
        });
      }
    }
  });

export const houseNumberQuerySchema = z.object({
  houseNumber: nonEmptyString.max(24)
});

export const residentPushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url().max(2_048),
  expirationTime: z.number().int().nullable().optional(),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(1_024),
    auth: z.string().trim().min(1).max(512)
  })
});

export const mediaUploadCategorySchema = z.enum([
  "support_evidence",
  "building_profile"
]);

export const mediaUploadSignatureRequestSchema = z.object({
  category: mediaUploadCategorySchema,
  buildingId: nonEmptyString.optional()
});

export const deleteResidentPushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url().max(2_048)
});

export const updateResidentNotificationPreferencesSchema = z
  .object({
    smsEnabled: z.boolean().optional(),
    rentEnabled: z.boolean().optional(),
    utilityEnabled: z.boolean().optional(),
    supportEnabled: z.boolean().optional()
  })
  .refine(
    (value) =>
      typeof value.smsEnabled === "boolean" ||
      typeof value.rentEnabled === "boolean" ||
      typeof value.utilityEnabled === "boolean" ||
      typeof value.supportEnabled === "boolean",
    {
      message: "Provide at least one notification preference to update."
    }
  );

export const upsertRentDueSchema = z.object({
  monthlyRentKsh: z.number().int().min(0).max(500_000),
  balanceKsh: z.number().int().min(0).max(500_000),
  dueDate: z.string().datetime(),
  note: z.string().trim().max(280).optional()
});

export const utilityTypeSchema = z.enum(["water", "electricity"]);

export const utilityPaymentProviderSchema = z.enum([
  "mpesa",
  "cash",
  "bank",
  "card"
]);

export const billingMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "Use YYYY-MM format for billing month."
  });

const utilityMeterNumberField = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(
    (value) => {
      const normalized = value.trim().toUpperCase();
      return normalized !== "NO-METER" && normalized !== "METER-UNSET";
    },
    {
      message: "Enter the actual meter number or leave the field blank."
    }
  );

export const upsertUtilityMeterSchema = z.object({
  meterNumber: utilityMeterNumberField
});

export const createUtilityBillSchema = z
  .object({
    billingMonth: billingMonthSchema,
    meterNumber: utilityMeterNumberField.optional(),
    previousReading: z.number().min(0).max(10_000_000).optional(),
    currentReading: z.number().min(0).max(10_000_000).optional(),
    ratePerUnitKsh: z.number().min(0).max(50_000).optional(),
    fixedChargeKsh: z.number().min(0).max(200_000).default(0),
    dueDate: z.string().datetime(),
    note: z.string().trim().max(280).optional()
  })
  .superRefine((value, context) => {
    const hasCurrentReading = value.currentReading != null;
    const hasRate = value.ratePerUnitKsh != null;
    const hasAnyReadingData = value.previousReading != null || hasCurrentReading;

    if (hasRate && !hasCurrentReading) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentReading"],
        message: "Current reading is required when rate per unit is provided."
      });
    }

    if (value.previousReading != null && !hasCurrentReading) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentReading"],
        message: "Current reading is required when previous reading is provided."
      });
    }

    if (
      value.previousReading != null &&
      value.currentReading != null &&
      value.currentReading < value.previousReading
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentReading"],
        message:
          "Current reading must be greater than or equal to previous reading."
      });
    }

    if (!hasAnyReadingData && value.fixedChargeKsh <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedChargeKsh"],
        message:
          "Provide a fixed charge greater than zero, or meter reading details."
      });
    }
  });

export const recordUtilityPaymentSchema = z.object({
  billingMonth: billingMonthSchema.optional(),
  amountKsh: z.number().positive().max(500_000),
  provider: utilityPaymentProviderSchema.default("mpesa"),
  providerReference: z.string().trim().max(120).optional(),
  paidAt: z.string().datetime().optional(),
  note: z.string().trim().max(280).optional()
});

export const ticketStatusSchema = z.enum([
  "open",
  "triaged",
  "in_progress",
  "resolved"
]);

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
  resolutionNotes: z.string().trim().max(500).optional(),
  adminNote: z.string().trim().max(500).optional()
});

export const tenantIdentityTypeSchema = z.enum([
  "national_id",
  "passport",
  "alien_id",
  "other"
]);

export const tenantOccupationStatusSchema = z.enum([
  "employed",
  "self_employed",
  "student",
  "sponsored",
  "unemployed",
  "other"
]);

const optionalTenantIdentityTypeSchema = z.preprocess(
  emptyStringToUndefined,
  tenantIdentityTypeSchema.optional()
);
const optionalTenantOccupationStatusSchema = z.preprocess(
  emptyStringToUndefined,
  tenantOccupationStatusSchema.optional()
);
const optionalTenantTextSchema = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());
const optionalTenantPhoneSchema = z.preprocess(
  emptyStringToUndefined,
  kenyaPhoneSchema.optional()
);

export const residentPasswordSetupSchema = z.object({
  buildingId: nonEmptyString,
  houseNumber: nonEmptyString.max(24),
  phoneNumber: kenyaPhoneSchema,
  password: z.string().min(8).max(128),
  identityType: optionalTenantIdentityTypeSchema,
  identityNumber: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(4).max(80).optional()
  ),
  occupationStatus: optionalTenantOccupationStatusSchema,
  occupationLabel: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(2).max(120).optional()
  )
});

export const residentPhoneLoginSchema = z.object({
  buildingId: z.preprocess(emptyStringToUndefined, nonEmptyString.optional()),
  houseNumber: z.preprocess(
    emptyStringToUndefined,
    nonEmptyString.max(24).optional()
  ),
  phoneNumber: kenyaPhoneSchema,
  password: z.string().min(1).max(128)
});

export const residentChangePasswordSchema = z
  .object({
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirmation password must match the new password."
      });
    }
  });

export const residentAdminPasswordResetSchema = z.object({
  buildingId: nonEmptyString,
  houseNumber: nonEmptyString.max(24),
  phoneNumber: kenyaPhoneSchema,
  temporaryPassword: z.string().min(8).max(128)
});

export const residentPasswordRecoveryRequestSchema = z.object({
  buildingId: nonEmptyString,
  houseNumber: nonEmptyString.max(24),
  phoneNumber: kenyaPhoneSchema,
  note: z.string().trim().max(280).optional()
});

export const accountPasswordRecoveryRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  note: z.string().trim().max(280).optional()
});

export const residentPasswordRecoveryReviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    temporaryPassword: z.string().min(8).max(128).optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((value, context) => {
    if (value.action === "approve" && !value.temporaryPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["temporaryPassword"],
        message: "Temporary password is required when approving a reset request."
      });
    }
  });

export const adminLoginSchema = z
  .object({
    accessToken: z.string().trim().max(200).optional(),
    username: z.string().trim().max(80).optional(),
    password: z.string().trim().max(120).optional()
  })
  .superRefine((value, context) => {
    const hasToken = Boolean(value.accessToken && value.accessToken.length > 0);
    const hasUsername = Boolean(value.username && value.username.length > 0);
    const hasPassword = Boolean(value.password && value.password.length > 0);

    if (hasToken) {
      return;
    }

    if (hasUsername && hasPassword) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["accessToken"],
      message: "Provide either accessToken or username/password."
    });
  });

export const adminAccessCredentialUpdateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[A-Za-z0-9._@-]+$/, {
        message:
          "Username can only include letters, numbers, dots, underscores, hyphens, and @."
      }),
    password: z.string().trim().min(8).max(120),
    confirmPassword: z.string().trim().min(8).max(120)
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirmation password must match the new password."
      });
    }
  });

export const userRoleSchema = z.enum(["tenant", "landlord", "admin", "root_admin"]);

export const userRegisterSchema = z.object({
  fullName: nonEmptyString.max(120),
  email: z.string().trim().email().max(160),
  phoneNumber: kenyaPhoneSchema,
  password: z.string().min(8).max(128)
});

export const ownerStaffCreateSchema = z.object({
  fullName: nonEmptyString.max(120),
  email: z.string().trim().email().max(160),
  phoneNumber: kenyaPhoneSchema,
  temporaryPassword: z.string().min(8).max(128),
  note: z.string().trim().max(280).optional()
});

export const ownerStaffDisableSchema = z.object({
  confirmUserId: nonEmptyString.max(120).optional(),
  confirmationText: z.literal("DISABLE").optional(),
  note: z.string().trim().max(280).optional()
});

export const userLoginSchema = z
  .object({
    email: z.string().trim().email().max(160).optional(),
    phoneNumber: kenyaPhoneSchema.optional(),
    password: z.string().min(1).max(128)
  })
  .superRefine((value, context) => {
    const hasEmail = Boolean(value.email && value.email.trim().length > 0);
    const hasPhone = Boolean(
      value.phoneNumber && value.phoneNumber.trim().length > 0
    );

    if (hasEmail || hasPhone) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Provide either email or phone number."
    });
  });

export const tenantApplicationSchema = z.object({
  buildingId: nonEmptyString,
  houseNumber: nonEmptyString.max(24),
  identityType: optionalTenantIdentityTypeSchema,
  identityNumber: optionalTenantTextSchema(80),
  occupationStatus: optionalTenantOccupationStatusSchema,
  occupationLabel: optionalTenantTextSchema(120),
  note: optionalTenantTextSchema(280)
});

const tenantAgreementDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Use YYYY-MM-DD format."
  });

export const tenantAgreementUpsertSchema = z
  .object({
    identityType: optionalTenantIdentityTypeSchema,
    identityNumber: optionalTenantTextSchema(80),
    occupationStatus: optionalTenantOccupationStatusSchema,
    occupationLabel: optionalTenantTextSchema(120),
    organizationName: optionalTenantTextSchema(160),
    organizationLocation: optionalTenantTextSchema(160),
    studentRegistrationNumber: optionalTenantTextSchema(80),
    sponsorName: optionalTenantTextSchema(120),
    sponsorPhone: optionalTenantPhoneSchema,
    emergencyContactName: optionalTenantTextSchema(120),
    emergencyContactPhone: optionalTenantPhoneSchema,
    leaseStartDate: tenantAgreementDateSchema.optional(),
    leaseEndDate: tenantAgreementDateSchema.optional(),
    monthlyRentKsh: z.number().int().min(0).max(10_000_000).optional(),
    depositKsh: z.number().int().min(0).max(10_000_000).optional(),
    paymentDueDay: z.number().int().min(1).max(31).optional(),
    specialTerms: z.string().trim().max(1_200).optional()
  })
  .superRefine((value, context) => {
    if (value.identityNumber && !value.identityType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identityType"],
        message: "Select the ID type for the provided ID number."
      });
    }

    if (
      value.occupationStatus &&
      ["employed", "self_employed", "student"].includes(value.occupationStatus) &&
      !value.organizationName
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationName"],
        message:
          "Employer, business, or school name is required for this occupation status."
      });
    }

    if (value.leaseStartDate && value.leaseEndDate) {
      const startAt = new Date(`${value.leaseStartDate}T00:00:00.000Z`);
      const endAt = new Date(`${value.leaseEndDate}T00:00:00.000Z`);
      if (endAt.getTime() < startAt.getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["leaseEndDate"],
          message: "Lease end date must be on or after the lease start date."
        });
      }
    }
  });

export const residentTenantProfileUpsertSchema = z
  .object({
    identityType: optionalTenantIdentityTypeSchema,
    identityNumber: optionalTenantTextSchema(80),
    occupationStatus: optionalTenantOccupationStatusSchema,
    occupationLabel: optionalTenantTextSchema(120),
    organizationName: optionalTenantTextSchema(160),
    organizationLocation: optionalTenantTextSchema(160),
    studentRegistrationNumber: optionalTenantTextSchema(80),
    sponsorName: optionalTenantTextSchema(120),
    sponsorPhone: optionalTenantPhoneSchema,
    emergencyContactName: optionalTenantTextSchema(120),
    emergencyContactPhone: optionalTenantPhoneSchema
  })
  .superRefine((value, context) => {
    if (value.identityNumber && !value.identityType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identityType"],
        message: "Select the ID type for the provided ID number."
      });
    }

    if (
      value.occupationStatus &&
      ["employed", "self_employed", "student"].includes(value.occupationStatus) &&
      !value.organizationName
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizationName"],
        message:
          "Employer, business, or school name is required for this occupation status."
      });
    }
  });

export const landlordDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(280).optional()
});

export const landlordPaymentAccessUpdateSchema = z
  .object({
    rentEnabled: z.boolean().optional(),
    waterEnabled: z.boolean().optional(),
    electricityEnabled: z.boolean().optional(),
    acknowledgeImpact: z.literal(true),
    note: z.string().trim().max(280).optional()
  })
  .refine(
    (value) =>
      typeof value.rentEnabled === "boolean" ||
      typeof value.waterEnabled === "boolean" ||
      typeof value.electricityEnabled === "boolean",
    {
      message: "Provide at least one payment toggle to update."
    }
  );

export const landlordBuildingConfigurationUpdateSchema = z
  .object({
    rentEnabled: z.boolean().optional(),
    waterEnabled: z.boolean().optional(),
    electricityEnabled: z.boolean().optional(),
    wifiEnabled: z.boolean().optional(),
    tenantApplicationsEnabled: z.boolean().optional(),
    tenantAgreementsEnabled: z.boolean().optional(),
    incidentsEnabled: z.boolean().optional(),
    maintenanceEnabled: z.boolean().optional(),
    caretakerEnabled: z.boolean().optional(),
    expenditureTrackingEnabled: z.boolean().optional(),
    utilityBillingMode: utilityBillingModeSchema.optional(),
    defaultWaterRatePerUnitKsh: z.number().min(0).max(50_000).nullable().optional(),
    defaultElectricityRatePerUnitKsh: z.number().min(0).max(50_000).nullable().optional(),
    defaultWaterFixedChargeKsh: z.number().min(0).max(200_000).nullable().optional(),
    defaultElectricityFixedChargeKsh: z.number().min(0).max(200_000).nullable().optional(),
    defaultCombinedUtilityChargeKsh: z.number().int().min(0).max(200_000).nullable().optional(),
    utilityBalanceVisibleDays: z.number().int().min(0).max(60).optional(),
    rentGraceDays: z.number().int().min(0).max(31).optional(),
    allowManualRentPosting: z.boolean().optional(),
    allowManualUtilityPosting: z.boolean().optional(),
    wifiAccessMode: wifiAccessModeSchema.optional(),
    acknowledgeImpact: z.literal(true),
    note: z.string().trim().max(280).optional()
  })
  .refine(
    (value) =>
      typeof value.rentEnabled === "boolean" ||
      typeof value.waterEnabled === "boolean" ||
      typeof value.electricityEnabled === "boolean" ||
      typeof value.wifiEnabled === "boolean" ||
      typeof value.tenantApplicationsEnabled === "boolean" ||
      typeof value.tenantAgreementsEnabled === "boolean" ||
      typeof value.incidentsEnabled === "boolean" ||
      typeof value.maintenanceEnabled === "boolean" ||
      typeof value.caretakerEnabled === "boolean" ||
      typeof value.expenditureTrackingEnabled === "boolean" ||
      value.defaultWaterRatePerUnitKsh !== undefined ||
      value.defaultElectricityRatePerUnitKsh !== undefined ||
      value.defaultWaterFixedChargeKsh !== undefined ||
      value.defaultElectricityFixedChargeKsh !== undefined ||
      typeof value.utilityBalanceVisibleDays === "number" ||
      value.defaultCombinedUtilityChargeKsh !== undefined ||
      typeof value.rentGraceDays === "number" ||
      typeof value.allowManualRentPosting === "boolean" ||
      typeof value.allowManualUtilityPosting === "boolean" ||
      typeof value.utilityBillingMode === "string" ||
      typeof value.wifiAccessMode === "string",
    {
      message: "Provide at least one configuration field to update."
    }
  );

const optionalMeterNumberSchema = z.string().trim().max(80).optional();
const householdMembersSchema = z.number().int().min(0).max(20);
const optionalFixedChargeSchema = z.number().min(0).max(200_000).optional();
const optionalReadingSchema = z.number().min(0).max(10_000_000).optional();
const utilityRateDefaultsSchema = z
  .object({
    waterRatePerUnitKsh: z.number().min(0).max(50_000).optional(),
    electricityRatePerUnitKsh: z.number().min(0).max(50_000).optional()
  })
  .optional();

export const landlordUtilityRegistryUpsertSchema = z.object({
  rows: z
    .array(
      z.object({
        houseNumber: nonEmptyString.max(24),
        waterMeterNumber: optionalMeterNumberSchema,
        electricityMeterNumber: optionalMeterNumberSchema,
        householdMembers: householdMembersSchema.optional(),
        waterFixedChargeKsh: optionalFixedChargeSchema,
        electricityFixedChargeKsh: optionalFixedChargeSchema,
        combinedUtilityChargeKsh: optionalFixedChargeSchema
      })
    )
    .min(1)
    .max(2_000),
  rateDefaults: utilityRateDefaultsSchema
});

export const landlordMonthlyCombinedUtilityChargeSchema = z.object({
  billingMonth: billingMonthSchema,
  amountKsh: z.number().int().min(1).max(200_000),
  acknowledgeImpact: z.literal(true)
});

export const landlordUtilityBulkSubmissionAuditCreateSchema = z.object({
  billingMonth: billingMonthSchema,
  dueDate: z.string().datetime(),
  note: z.string().trim().max(280).optional(),
  defaultWaterFixedChargeKsh: z.number().min(0).max(200_000).nullable().optional(),
  defaultElectricityFixedChargeKsh: z.number().min(0).max(200_000).nullable().optional(),
  defaultCombinedUtilityChargeKsh: z.number().int().min(0).max(200_000).nullable().optional(),
  monthlyCombinedUtilityChargeKsh: z.number().int().min(0).max(200_000).nullable().optional(),
  rateDefaults: utilityRateDefaultsSchema,
  rows: z
    .array(
      z.object({
        houseNumber: nonEmptyString.max(24),
        householdMembers: householdMembersSchema.optional(),
        hasActiveResident: z.boolean().optional(),
        waterMeterNumber: optionalMeterNumberSchema,
        waterPreviousReading: optionalReadingSchema,
        waterCurrentReading: optionalReadingSchema,
        waterFixedChargeKsh: optionalFixedChargeSchema,
        electricityMeterNumber: optionalMeterNumberSchema,
        electricityPreviousReading: optionalReadingSchema,
        electricityCurrentReading: optionalReadingSchema,
        electricityFixedChargeKsh: optionalFixedChargeSchema
      })
    )
    .min(1)
    .max(2_000)
});

export const landlordUtilityBulkSubmissionAuditFinalizeSchema = z.object({
  status: z.enum(["completed", "partial_failed", "failed"]),
  postedCount: z.number().int().min(0).max(10_000),
  requestedCount: z.number().int().min(0).max(10_000),
  failures: z.array(z.string().trim().min(1).max(500)).max(500).default([]),
  completedAt: z.string().datetime().optional()
});

export const landlordAssignCaretakerSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  houseNumber: nonEmptyString.max(24),
  note: z.string().trim().max(280).optional()
});

export const landlordExpenditureCreateSchema = z.object({
  buildingId: nonEmptyString,
  houseNumber: nonEmptyString.max(24).optional(),
  category: z.enum([
    "maintenance",
    "utilities",
    "cleaning",
    "security",
    "supplies",
    "staff",
    "other"
  ]),
  title: z.string().trim().min(3).max(120),
  amountKsh: z.number().positive().max(2_000_000),
  chargeableToResident: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional()
});

export const caretakerAccessResolveSchema = z.object({
  phoneNumber: kenyaPhoneSchema,
  houseNumber: nonEmptyString.max(24),
  buildingId: nonEmptyString.optional()
});

export const caretakerPasswordSetupSchema = z
  .object({
    phoneNumber: kenyaPhoneSchema,
    houseNumber: nonEmptyString.max(24),
    buildingId: nonEmptyString.optional(),
    newPassword: z.string().min(8).max(128)
  });

export const caretakerPhoneLoginSchema = z.object({
  phoneNumber: kenyaPhoneSchema,
  houseNumber: nonEmptyString.max(24),
  buildingId: nonEmptyString.optional(),
  password: z.string().min(1).max(128)
});

export const caretakerAccessRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected"
]);

export const reviewCaretakerAccessRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional()
});

export const landlordUpdateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
  resolutionNotes: z.string().trim().min(1).max(500).optional(),
  adminNote: z.string().trim().max(500).optional()
});

export const landlordAccessRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected"
]);

export const createLandlordAccessRequestSchema = z.object({
  reason: z.string().trim().min(5).max(500).optional()
});

export const reviewLandlordAccessRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional()
});

export const rentMpesaCallbackSchema = z.object({
  buildingId: nonEmptyString.optional(),
  houseNumber: nonEmptyString.max(24),
  amountKsh: z.number().positive().max(500_000),
  providerReference: nonEmptyString.max(120),
  phoneNumber: kenyaPhoneSchema.optional(),
  billingMonth: billingMonthSchema.optional(),
  tenantUserId: z.string().trim().max(120).optional(),
  tenantName: z.string().trim().max(160).optional(),
  paidAt: z.string().datetime().optional(),
  rawPayload: z.unknown().optional()
});

export const tenantResolveSchema = z.object({
  houseNumber: nonEmptyString.max(24),
  phoneNumber: kenyaPhoneSchema,
  buildingId: nonEmptyString.optional()
});

export const createRentPaymentSchema = z.object({
  amountKsh: z.number().positive().max(500_000),
  providerReference: nonEmptyString.max(120),
  billingMonth: billingMonthSchema.optional(),
  paidAt: z.string().datetime().optional()
});

export const recordAdminRentPaymentSchema = z.object({
  amountKsh: z.number().positive().max(500_000),
  provider: utilityPaymentProviderSchema.default("cash"),
  providerReference: nonEmptyString.max(120).optional(),
  billingMonth: billingMonthSchema.optional(),
  paidAt: z.string().datetime().optional(),
  phoneNumber: kenyaPhoneSchema.optional()
});

export const residentDebtCollectionSchema = z.object({
  amountKsh: z.number().positive().max(5_000_000).optional(),
  provider: utilityPaymentProviderSchema.default("cash"),
  providerReference: nonEmptyString.max(120).optional(),
  paidAt: z.string().datetime().optional(),
  note: z.string().trim().max(280).optional()
});

export const roomBillingHoldScopeSchema = z.enum(["rent", "utilities", "all"]);

export const createRoomBillingHoldSchema = z
  .object({
    scope: roomBillingHoldScopeSchema,
    utilityType: utilityTypeSchema.optional(),
    startMonth: billingMonthSchema,
    endMonth: billingMonthSchema,
    reason: z.string().trim().min(3).max(280).optional()
  })
  .superRefine((value, ctx) => {
    if (value.endMonth < value.startMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMonth"],
        message: "End month must be the same as or after the start month."
      });
    }

    if (value.utilityType && value.scope !== "utilities") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["utilityType"],
        message: "Specific utility type can only be used with a utilities hold."
      });
    }
  });

export const cancelRoomBillingHoldSchema = z.object({
  reason: z.string().trim().max(280).optional()
});

export const rentPaymentMethodSchema = z.enum(["mpesa"]);

export const initializeRentMpesaPaymentSchema = z.object({
  amountKsh: z.number().positive().max(500_000),
  billingMonth: billingMonthSchema.optional(),
  phoneNumber: kenyaPhoneSchema.optional(),
  paymentMethod: rentPaymentMethodSchema.default("mpesa")
});

export const verifyRentMpesaPaymentSchema = z.object({
  checkoutRequestId: nonEmptyString.max(120)
});

export const initializeUtilityMpesaPaymentSchema = z.object({
  amountKsh: z.number().positive().max(500_000),
  billingMonth: billingMonthSchema.optional(),
  phoneNumber: kenyaPhoneSchema.optional(),
  paymentMethod: rentPaymentMethodSchema.default("mpesa")
});

export const verifyUtilityMpesaPaymentSchema = z.object({
  checkoutRequestId: nonEmptyString.max(120)
});

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type DeleteBuildingInput = z.infer<typeof deleteBuildingSchema>;
export type LandlordAddBuildingHousesInput = z.infer<
  typeof landlordAddBuildingHousesSchema
>;
export type BuildingMediaUpdateInput = z.infer<typeof buildingMediaUpdateSchema>;
export type LandlordRemoveBuildingHouseInput = z.infer<
  typeof landlordRemoveBuildingHouseSchema
>;
export type LandlordRemoveBuildingUserInput = z.infer<
  typeof landlordRemoveBuildingUserSchema
>;
export type LandlordExpenditureCreateInput = z.infer<
  typeof landlordExpenditureCreateSchema
>;
export type AdminRevokeLandlordInput = z.infer<
  typeof adminRevokeLandlordSchema
>;
export type AdminAssignBuildingLandlordInput = z.infer<
  typeof adminAssignBuildingLandlordSchema
>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
export type CreateVacancySnapshotInput = z.infer<
  typeof createVacancySnapshotSchema
>;
export type CreateWifiPaymentInput = z.infer<typeof createWifiPaymentSchema>;
export type ConfirmWifiPaymentInput = z.infer<typeof confirmWifiPaymentSchema>;
export type UpdateWifiPackageInput = z.infer<typeof updateWifiPackageSchema>;
export type CreateUserReportInput = z.infer<typeof createUserReportSchema>;
export type UpsertRentDueInput = z.infer<typeof upsertRentDueSchema>;
export type UtilityTypeInput = z.infer<typeof utilityTypeSchema>;
export type UpsertUtilityMeterInput = z.infer<typeof upsertUtilityMeterSchema>;
export type CreateUtilityBillInput = z.infer<typeof createUtilityBillSchema>;
export type RecordUtilityPaymentInput = z.infer<typeof recordUtilityPaymentSchema>;
export type RecordAdminRentPaymentInput = z.infer<typeof recordAdminRentPaymentSchema>;
export type ResidentDebtCollectionInput = z.infer<
  typeof residentDebtCollectionSchema
>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AdminAccessCredentialUpdateInput = z.infer<
  typeof adminAccessCredentialUpdateSchema
>;
export type MediaUploadCategoryInput = z.infer<typeof mediaUploadCategorySchema>;
export type MediaUploadSignatureRequestInput = z.infer<
  typeof mediaUploadSignatureRequestSchema
>;
export type ResidentPasswordSetupInput = z.infer<
  typeof residentPasswordSetupSchema
>;
export type ResidentPhoneLoginInput = z.infer<typeof residentPhoneLoginSchema>;
export type UpdateResidentNotificationPreferencesInput = z.infer<
  typeof updateResidentNotificationPreferencesSchema
>;
export type ResidentChangePasswordInput = z.infer<
  typeof residentChangePasswordSchema
>;
export type ResidentAdminPasswordResetInput = z.infer<
  typeof residentAdminPasswordResetSchema
>;
export type ResidentPasswordRecoveryRequestInput = z.infer<
  typeof residentPasswordRecoveryRequestSchema
>;
export type AccountPasswordRecoveryRequestInput = z.infer<
  typeof accountPasswordRecoveryRequestSchema
>;
export type ResidentPasswordRecoveryReviewInput = z.infer<
  typeof residentPasswordRecoveryReviewSchema
>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type OwnerStaffCreateInput = z.infer<typeof ownerStaffCreateSchema>;
export type OwnerStaffDisableInput = z.infer<typeof ownerStaffDisableSchema>;
export type TenantApplicationInput = z.infer<typeof tenantApplicationSchema>;
export type TenantAgreementUpsertInput = z.infer<typeof tenantAgreementUpsertSchema>;
export type LandlordDecisionInput = z.infer<typeof landlordDecisionSchema>;
export type LandlordPaymentAccessUpdateInput = z.infer<
  typeof landlordPaymentAccessUpdateSchema
>;
export type LandlordBuildingConfigurationUpdateInput = z.infer<
  typeof landlordBuildingConfigurationUpdateSchema
>;
export type LandlordUtilityRegistryUpsertInput = z.infer<
  typeof landlordUtilityRegistryUpsertSchema
>;
export type LandlordUtilityBulkSubmissionAuditCreateInput = z.infer<
  typeof landlordUtilityBulkSubmissionAuditCreateSchema
>;
export type LandlordUtilityBulkSubmissionAuditFinalizeInput = z.infer<
  typeof landlordUtilityBulkSubmissionAuditFinalizeSchema
>;
export type CreateRoomBillingHoldInput = z.infer<typeof createRoomBillingHoldSchema>;
export type CancelRoomBillingHoldInput = z.infer<typeof cancelRoomBillingHoldSchema>;
export type LandlordWriteOffRoomBalanceInput = z.infer<
  typeof landlordWriteOffRoomBalanceSchema
>;
export type LandlordAssignCaretakerInput = z.infer<
  typeof landlordAssignCaretakerSchema
>;
export type CaretakerAccessResolveInput = z.infer<
  typeof caretakerAccessResolveSchema
>;
export type CaretakerPasswordSetupInput = z.infer<
  typeof caretakerPasswordSetupSchema
>;
export type CaretakerPhoneLoginInput = z.infer<
  typeof caretakerPhoneLoginSchema
>;
export type CaretakerAccessRequestStatusInput = z.infer<
  typeof caretakerAccessRequestStatusSchema
>;
export type ReviewCaretakerAccessRequestInput = z.infer<
  typeof reviewCaretakerAccessRequestSchema
>;
export type LandlordUpdateTicketStatusInput = z.infer<
  typeof landlordUpdateTicketStatusSchema
>;
export type LandlordAccessRequestStatusInput = z.infer<
  typeof landlordAccessRequestStatusSchema
>;
export type CreateLandlordAccessRequestInput = z.infer<
  typeof createLandlordAccessRequestSchema
>;
export type ReviewLandlordAccessRequestInput = z.infer<
  typeof reviewLandlordAccessRequestSchema
>;
export type RentMpesaCallbackInput = z.infer<typeof rentMpesaCallbackSchema>;
export type TenantResolveInput = z.infer<typeof tenantResolveSchema>;
export type CreateRentPaymentInput = z.infer<typeof createRentPaymentSchema>;
export type InitializeRentMpesaPaymentInput = z.infer<
  typeof initializeRentMpesaPaymentSchema
>;
export type VerifyRentMpesaPaymentInput = z.infer<
  typeof verifyRentMpesaPaymentSchema
>;
export type InitializeUtilityMpesaPaymentInput = z.infer<
  typeof initializeUtilityMpesaPaymentSchema
>;
export type VerifyUtilityMpesaPaymentInput = z.infer<
  typeof verifyUtilityMpesaPaymentSchema
>;
