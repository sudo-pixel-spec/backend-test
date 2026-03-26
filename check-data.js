"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Standard_1 = require("./src/models/Standard");
const Subject_1 = require("./src/models/Subject");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function check() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    const standards = await Standard_1.Standard.find().lean();
    console.log("Standards:", JSON.stringify(standards, null, 2));
    const subjects = await Subject_1.Subject.find().lean();
    console.log("Total Subjects:", subjects.length);
    console.log("All Subjects:", JSON.stringify(subjects, null, 2));
    const { Unit } = await import("./src/models/Unit");
    const { Chapter } = await import("./src/models/Chapter");
    const { Lesson } = await import("./src/models/Lesson");
    console.log("Units Count:", await Unit.countDocuments());
    console.log("Chapters Count:", await Chapter.countDocuments());
    console.log("Lessons Count:", await Lesson.countDocuments());
    process.exit(0);
}
check().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=check-data.js.map