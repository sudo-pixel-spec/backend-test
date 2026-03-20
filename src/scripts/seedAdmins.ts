import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";
import { Standard } from "../models/Standard";

async function seed() {
  console.log("🌱 Seeding Admin Accounts...");
  await connectDB();

  try {
    let grade10 = await Standard.findOne({ code: "G10" });
    if (!grade10) {
      grade10 = await Standard.create({ code: "G10", name: "Grade 10", active: true });
      console.log("✅ Created Standard: Grade 10");
    }

    let grade12 = await Standard.findOne({ code: "G12" });
    if (!grade12) {
      grade12 = await Standard.create({ code: "G12", name: "Grade 12", active: true });
      console.log("✅ Created Standard: Grade 12");
    }

    const superAdminPhone = "+919999999999";
    let superAdmin = await User.findOne({ phone: superAdminPhone });
    if (!superAdmin) {
      superAdmin = await User.create({
        phone: superAdminPhone,
        role: "admin",
        adminType: "super",
        profile: {
          fullName: "Global Super Admin"
        },
        profileComplete: true
      });
      console.log("👑 Created Super Admin: +919999999999");
    } else {
      await User.updateOne({ _id: superAdmin._id }, { role: "admin", adminType: "super" });
      console.log("👑 Updated Super Admin status: +919999999999");
    }

    const regularAdminPhone = "+918888888888";
    let regularAdmin = await User.findOne({ phone: regularAdminPhone });
    if (!regularAdmin) {
      regularAdmin = await User.create({
        phone: regularAdminPhone,
        role: "admin",
        adminType: "regular",
        allocatedStandards: [grade10._id, grade12._id],
        profile: {
          fullName: "Regular Grade Admin"
        },
        profileComplete: true
      });
      console.log("👤 Created Regular Admin: +918888888888 (Assigned G10, G12)");
    } else {
      await User.updateOne(
        { _id: regularAdmin._id }, 
        { 
          role: "admin", 
          adminType: "regular", 
          allocatedStandards: [grade10._id, grade12._id] 
        }
      );
      console.log("👤 Updated Regular Admin status: +918888888888 (Assigned G10, G12)");
    }

    console.log("✨ Seeding Completed Successfully!");
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
  } finally {
    await disconnectDB();
  }
}

seed();
