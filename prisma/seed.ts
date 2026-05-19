import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

async function main() {
  const ownerEmail =
    process.env.SEED_OWNER_EMAIL?.trim().toLowerCase() ??
    process.env.SEED_LANDLORD_EMAIL?.trim().toLowerCase() ??
    "owner@landlord.housing";
  const ownerPhone =
    process.env.SEED_OWNER_PHONE?.trim() ??
    process.env.SEED_LANDLORD_PHONE?.trim() ??
    "+254700000001";
  const ownerPassword =
    process.env.SEED_OWNER_PASSWORD?.trim() ??
    process.env.SEED_LANDLORD_PASSWORD?.trim() ??
    "ChangeMeNow123!";
  const ownerName =
    process.env.SEED_OWNER_NAME?.trim() ??
    process.env.SEED_LANDLORD_NAME?.trim() ??
    "Primary Owner";
  const buildingId =
    process.env.SEED_BUILDING_ID?.trim() ?? "LANDLORD-BLDG-00001";
  const buildingName =
    process.env.SEED_BUILDING_NAME?.trim() ?? "Main Building";
  const buildingAddress =
    process.env.SEED_BUILDING_ADDRESS?.trim() ?? "Set building address";
  const buildingCounty =
    process.env.SEED_BUILDING_COUNTY?.trim() ?? "Nairobi";

  const owner = await prisma.housingUser.upsert({
    where: { email: ownerEmail },
    update: {
      fullName: ownerName,
      phone: ownerPhone,
      role: "landlord",
      status: "active",
      passwordHash: hashPassword(ownerPassword)
    },
    create: {
      fullName: ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      role: "landlord",
      status: "active",
      passwordHash: hashPassword(ownerPassword)
    }
  });

  await prisma.building.upsert({
    where: { id: buildingId },
    update: {
      landlordUserId: owner.id,
      name: buildingName,
      address: buildingAddress,
      county: buildingCounty,
      cctvStatus: "verified",
      units: 8,
      mediaImageUrls: [],
      mediaVideoUrls: [],
      mediaNeighborhoodNotes: "Initial seeded building. Update details in management."
    },
    create: {
      id: buildingId,
      landlordUserId: owner.id,
      name: buildingName,
      address: buildingAddress,
      county: buildingCounty,
      cctvStatus: "verified",
      units: 8,
      mediaImageUrls: [],
      mediaVideoUrls: [],
      mediaNeighborhoodNotes: "Initial seeded building. Update details in management."
    }
  });

  const defaultUnits = [
    "A-1",
    "A-2",
    "A-3",
    "A-4",
    "B-1",
    "B-2",
    "B-3",
    "B-4"
  ];

  for (const houseNumber of defaultUnits) {
    await prisma.houseUnit.upsert({
      where: {
          buildingId_houseNumber: {
          buildingId,
          houseNumber
        }
      },
      update: { isActive: true },
      create: {
        buildingId,
        houseNumber,
        isActive: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
