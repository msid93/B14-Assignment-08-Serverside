import { auth } from "../src/auth.js";
import { client, db, prepareDatabase, studios } from "../src/db.js";

const accounts = [
  {
    name: "Mira Rahman",
    email: "host@studiospace.example",
    password: process.env.SEED_HOST_PASSWORD || "StudioHost42",
  },
  {
    name: "Rafi Karim",
    email: "creator@studiospace.example",
    password: process.env.SEED_CREATOR_PASSWORD || "StudioGuest42",
  },
];
const listings = [
  [
    "Northlight Loft",
    "Photo Studio",
    42,
    50,
    8,
    "Tejgaon, Dhaka",
    "daylight",
    ["North light", "C-stands", "Changing area"],
    "Tall factory windows cast a broad wash across a pale sweep. Use the open end for full-length portraits, or roll a table near the brick wall for product work.",
    "Easy load-in and soft light all morning.",
    5,
  ],
  [
    "Framehouse Stage",
    "Film Stage",
    65,
    120,
    18,
    "Nasirabad, Chattogram",
    "film",
    ["Blackout", "Lighting grid", "Loading bay"],
    "A black-box stage with room to lay a short dolly track. The lighting grid and side entrance make small set builds and evening shoots easy to plan.",
    "Room for our entire interview setup.",
    5,
  ],
  [
    "The Listening Room",
    "Podcast Lounge",
    30,
    30,
    4,
    "Banani, Dhaka",
    "podcast",
    ["Microphones", "Headphones", "Sound treatment"],
    "Two matched microphones face a compact table in a treated recording room. Arrive with your interview notes and leave with separate audio tracks.",
    "The room tone was wonderfully quiet.",
    5,
  ],
  [
    "Signal House",
    "Music Suite",
    48,
    60,
    6,
    "Dhanmondi, Dhaka",
    "music",
    ["Studio monitors", "Audio interface", "Vocal booth"],
    "Write at the keys, track a vocal or check a mix at the desk. Acoustic panels keep the control room balanced for long listening sessions.",
    "The monitoring setup helped us finish a mix.",
    5,
  ],
  [
    "Clay & Grain Atelier",
    "Workshop",
    24,
    20,
    12,
    "Zindabazar, Sylhet",
    "workshop",
    ["Worktables", "Wash sink", "Natural light"],
    "Long shared benches, a deep wash sink and north-facing windows suit printmaking, drawing and small group workshops. Bring your own clay, inks or paper.",
    "Plenty of bench space for a class of eight.",
    5,
  ],
  [
    "Terracotta Corner",
    "Photo Studio",
    36,
    40,
    6,
    "Uttara, Dhaka",
    "portrait",
    ["Backdrop stand", "Softboxes", "Mirror"],
    "Warm painted walls and a compact seamless backdrop give portraits two looks within a few steps. A mirror and private changing corner are available on site.",
    "The warm wall worked beautifully for portraits.",
    5,
  ],
];

try {
  await prepareDatabase();
  for (const account of accounts) {
    if (!(await db.collection("user").findOne({ email: account.email }))) {
      await auth.api.signUpEmail({ body: account });
    }
  }
  const host = await db.collection("user").findOne({ email: accounts[0].email });
  const reviewerNames = ["Nila S.", "Anik R.", "Tisha A.", "Rumi K.", "Samira H.", "Jamil S."];
  for (const [i, row] of listings.entries()) {
    const [
      title,
      category,
      rate,
      deposit,
      capacity,
      location,
      photo,
      amenities,
      overview,
      comment,
      stars,
    ] = row;
    const reviews = [{ name: reviewerNames[i], stars, text: comment }];
    await studios.updateOne(
      { seedKey: photo },
      {
        $setOnInsert: {
          seedKey: photo,
          title,
          category,
          rate,
          deposit,
          capacity,
          location,
          overview,
          amenities,
          images: [`/photos/${photo}.webp`, `/photos/${photo}-detail.webp`],
          reviews,
          rating: stars,
          ownerId: host._id.toString(),
          ownerName: host.name,
          ownerEmail: host.email,
          ownerImage: "",
          createdAt: new Date(Date.UTC(2026, 0, 10 - i)),
        },
      },
      { upsert: true },
    );
  }
  console.log("Six demonstration studios and two examiner accounts are ready.");
} finally {
  await client.close();
}
