// Database seed script populating companies, leads, and tasks
require("dotenv").config();
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const User = require("./models/User");
const Company = require("./models/Company");
const Lead = require("./models/Lead");
const Task = require("./models/Task");

const runSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find();
    if (!users || users.length === 0) {
      console.error("No existing users found. Please run 'npm run register' first.");
      process.exit(1);
    }

    const john = users.find((u) => u.email === "john@mail.com") || users[0];
    const priya = users.find((u) => u.email === "priya@mail.com") || users[1] || users[0];
    const admin = users.find((u) => u.email === "admin@mail.com") || users[2] || users[0];

    // Delete only Companies, Leads, and Tasks (never users)
    await Promise.all([
      Company.deleteMany({}),
      Lead.deleteMany({}),
      Task.deleteMany({}),
    ]);

    // 1. Insert 5 companies covering at least 4 different industries
    const companiesData = [
      {
        name: "Acme Tech Solutions",
        industry: "IT",
        location: "Bengaluru, Karnataka",
        website: "https://acmetech.example.com",
      },
      {
        name: "BioHealth Diagnostics",
        industry: "Healthcare",
        location: "Hyderabad, Telangana",
        website: "https://biohealth.example.com",
      },
      {
        name: "Nexus Capital Partners",
        industry: "Finance",
        location: "Mumbai, Maharashtra",
        website: "https://nexuscapital.example.com",
      },
      {
        name: "Vanguard Precision Gear",
        industry: "Manufacturing",
        location: "Pune, Maharashtra",
        website: "https://vanguardgear.example.com",
      },
      {
        name: "Horizon Learning Institute",
        industry: "Education",
        location: "Delhi, NCR",
        website: "https://horizonedu.example.com",
      },
    ];

    const companies = await Company.insertMany(companiesData);

    // 2. Insert 12 leads spread over all four statuses, assigned to users, linked to companies
    // Includes 1 soft-deleted lead (isDeleted: true)
    const leadsData = [
      {
        name: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        phone: "+91 98765 43210",
        status: "New",
        assignedTo: john._id,
        company: companies[0]._id,
        isDeleted: false,
      },
      {
        name: "Ishita Roy",
        email: "ishita.roy@example.com",
        phone: "+91 98765 43211",
        status: "Contacted",
        assignedTo: priya._id,
        company: companies[1]._id,
        isDeleted: false,
      },
      {
        name: "Rohan Varma",
        email: "rohan.varma@example.com",
        phone: "+91 98765 43212",
        status: "Qualified",
        assignedTo: john._id,
        company: companies[2]._id,
        isDeleted: false,
      },
      {
        name: "Meera Nair",
        email: "meera.nair@example.com",
        phone: "+91 98765 43213",
        status: "Lost",
        assignedTo: admin._id,
        company: companies[3]._id,
        isDeleted: false,
      },
      {
        name: "Karan Patel",
        email: "karan.patel@example.com",
        phone: "+91 98765 43214",
        status: "New",
        assignedTo: priya._id,
        company: companies[4]._id,
        isDeleted: false,
      },
      {
        name: "Sanya Gupta",
        email: "sanya.gupta@example.com",
        phone: "+91 98765 43215",
        status: "Qualified",
        assignedTo: john._id,
        company: companies[0]._id,
        isDeleted: false,
      },
      {
        name: "Devendra Joshi",
        email: "devendra.joshi@example.com",
        phone: "+91 98765 43216",
        status: "Contacted",
        assignedTo: admin._id,
        company: companies[1]._id,
        isDeleted: false,
      },
      {
        name: "Ananya Mukherjee",
        email: "ananya.m@example.com",
        phone: "+91 98765 43217",
        status: "Qualified",
        assignedTo: priya._id,
        company: companies[2]._id,
        isDeleted: false,
      },
      {
        name: "Vikram Malhotra",
        email: "vikram.m@example.com",
        phone: "+91 98765 43218",
        status: "New",
        assignedTo: john._id,
        company: companies[3]._id,
        isDeleted: false,
      },
      {
        name: "Pooja Reddy",
        email: "pooja.reddy@example.com",
        phone: "+91 98765 43219",
        status: "Contacted",
        assignedTo: priya._id,
        company: companies[4]._id,
        isDeleted: false,
      },
      {
        name: "Kabir Sen",
        email: "kabir.sen@example.com",
        phone: "+91 98765 43220",
        status: "Qualified",
        assignedTo: admin._id,
        company: companies[0]._id,
        isDeleted: false,
      },
      {
        name: "Inactive Archival Lead",
        email: "archived.lead@example.com",
        phone: "+91 98765 43221",
        status: "Lost",
        assignedTo: john._id,
        company: companies[1]._id,
        isDeleted: true,
      },
    ];

    const leads = await Lead.insertMany(leadsData);
    const activeLeads = leads.filter((l) => !l.isDeleted);

    // 3. Insert 8 tasks:
    // at least 2 due today, 3 due in next 7 days, 1 overdue, 2 Done
    const tz = process.env.TIMEZONE || "Asia/Kolkata";
    const today = moment.tz(tz).startOf("day");
    const dayOverdue = today.clone().subtract(2, "days").toDate();
    const dayToday1 = today.clone().toDate();
    const dayToday2 = today.clone().toDate();
    const dayNext2 = today.clone().add(2, "days").toDate();
    const dayNext4 = today.clone().add(4, "days").toDate();
    const dayNext6 = today.clone().add(6, "days").toDate();
    const dayPastDone1 = today.clone().subtract(3, "days").toDate();
    const dayPastDone2 = today.clone().subtract(1, "day").toDate();

    const tasksData = [
      {
        title: "Initial Product Demo Call",
        lead: activeLeads[0]._id,
        dueDate: dayToday1,
        assignedTo: john._id,
        status: "To Do",
      },
      {
        title: "Send Technical Architecture Document",
        lead: activeLeads[1]._id,
        dueDate: dayToday2,
        assignedTo: priya._id,
        status: "Pending",
      },
      {
        title: "Security & Compliance Review",
        lead: activeLeads[2]._id,
        dueDate: dayNext2,
        assignedTo: john._id,
        status: "In Progress",
      },
      {
        title: "Pricing & Contract Negotiation",
        lead: activeLeads[5]._id,
        dueDate: dayNext4,
        assignedTo: priya._id,
        status: "To Do",
      },
      {
        title: "Procurement Legal Verification",
        lead: activeLeads[7]._id,
        dueDate: dayNext6,
        assignedTo: admin._id,
        status: "Pending",
      },
      {
        title: "Follow-up on Proposal Feedback",
        lead: activeLeads[4]._id,
        dueDate: dayOverdue,
        assignedTo: john._id,
        status: "In Progress",
      },
      {
        title: "Signed NDA Collection",
        lead: activeLeads[0]._id,
        dueDate: dayPastDone1,
        assignedTo: john._id,
        status: "Done",
      },
      {
        title: "Onboarding Kickoff Meeting",
        lead: activeLeads[2]._id,
        dueDate: dayPastDone2,
        assignedTo: priya._id,
        status: "Done",
      },
    ];

    const tasks = await Task.insertMany(tasksData);

    console.log(`Seed completed successfully:`);
    console.log(`- Companies created: ${companies.length}`);
    console.log(`- Leads created: ${leads.length} (${leads.filter((l) => l.isDeleted).length} soft-deleted)`);
    console.log(`- Tasks created: ${tasks.length}`);

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

runSeed();
