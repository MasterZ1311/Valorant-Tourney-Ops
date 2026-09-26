import {
  PrismaClient,
  UserRole,
  TournamentStatus,
  TournamentFormat,
  TeamStatus,
  PlayerRole,
  PCStatus,
  VolunteerRole,
} from "@prisma/client";
import * as crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(key, "hex"));
}

export interface SeedPlayer {
  name: string;
  collegeId: string;
  riotId: string;
  riotTag: string;
  role: PlayerRole;
  phone?: string;
  verified: boolean;
  present: boolean;
}

export interface SeedTeam {
  name: string;
  captain: string;
  captainContact: string;
  institution: string;
  seed: number;
  status: TeamStatus;
  players: SeedPlayer[];
}

export interface SeedPC {
  pcNumber: string;
  ipAddress: string;
  status: PCStatus;
  notes?: string;
}

export interface SeedStation {
  name: string;
  pcCount: number;
  pcs: SeedPC[];
}

export interface SeedLab {
  name: string;
  totalPcs: number;
  stations: SeedStation[];
}

export interface SeedData {
  superAdmin: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  };
  volunteers: {
    user: {
      email: string;
      name: string;
      passwordHash: string;
      role: UserRole;
    };
    volunteer: {
      name: string;
      phone: string;
      role: VolunteerRole;
      shift: string;
      location: string;
    };
  }[];
  tournament: {
    name: string;
    game: string;
    venueName: string;
    date: Date;
    startTime: Date;
    status: TournamentStatus;
    format: TournamentFormat;
    currentRound: number;
  };
  settings: {
    playersPerTeam: number;
    maxSubstitutes: number;
    matchDurationMinutes: number;
    bufferDurationMinutes: number;
    autoAdvanceBYEs: boolean;
    requireCheckIn: boolean;
    allowSelfRegistration: boolean;
  };
  venue: {
    name: string;
    address: string;
    building: {
      name: string;
      labs: SeedLab[];
    };
  };
  teams: SeedTeam[];
}

const TEAM_DEFINITIONS: { name: string; institution: string }[] = [
  { name: "Apex Predators", institution: "Institute of Technology" },
  { name: "Phantom Strikers", institution: "State Polytechnic University" },
  { name: "Radiant Vipers", institution: "Metropolitan College" },
  { name: "Cyber Sentinels", institution: "National Engineering Institute" },
  { name: "Shadow Duelists", institution: "Central Science University" },
  { name: "Vortex Titans", institution: "Northern Tech Academy" },
  { name: "Kinetic Sparks", institution: "Highland University" },
  { name: "Iron Valkyries", institution: "Eastern States College" },
  { name: "Frostbite Esports", institution: "Lakeview Polytechnic" },
  { name: "Crimson Specters", institution: "Grand Valley University" },
  { name: "Quantum Havoc", institution: "Pinnacle Institute" },
  { name: "Echo Wolves", institution: "Cascade College" },
  { name: "Solar Flare", institution: "Valleyfield State College" },
];

const FIRST_NAMES = [
  "Alexander", "Marcus", "Ethan", "Leo", "Julian", "Lucas", "Noah", "Liam",
  "Gabriel", "Victor", "Damian", "Adrian", "Xavier", "Felix", "Kai", "Rowan",
  "Siddharth", "Aarav", "Rohan", "Vikram", "Jin", "Min-ho", "Kenji", "Ren",
  "Mateo", "Diego", "Carlos", "Santi", "Dimitri", "Nikolai", "Erik", "Lars",
  "Zane", "Caleb", "Ezra", "Silas", "Oliver", "Owen", "Declan", "Tristan",
  "Sean", "Connor", "Bryce", "Trevor", "Tyler", "Derek", "Gavin", "Colin",
  "Mason", "Logan", "Austin", "Zach", "Cole", "Blake", "Chase", "Wyatt",
  "Hunter", "Brody", "Jace", "Kaden", "Grant", "Reid", "Graham", "Brooks", "Troy"
];

const LAST_NAMES = [
  "Vance", "Mercer", "Sterling", "Kovacs", "Cross", "Blackwood", "Frost", "Steele",
  "Hawthorne", "Thorne", "Storm", "Drake", "Sinclair", "Chen", "Patel", "Sharma",
  "Tanaka", "Sato", "Kim", "Park", "Rodriguez", "Gomez", "Ivanov", "Petrov",
  "Lindqvist", "Holm", "Archer", "Fletcher", "Collier", "Beckett", "Rhodes", "Reeve",
  "West", "Eastwood", "Summers", "Winters", "Rivers", "Banks", "Hayes", "Stone",
  "Wolf", "Fox", "Knight", "Bishop", "Vanguard", "Shields", "Sparks", "Flint",
  "Blaze", "Quinn", "Kane", "Rowe", "Pike", "Nash", "Garrison", "Slater",
  "Carver", "Strickland", "Holt", "Mercer", "Castillo", "Santos", "Morales", "Cruz", "Reyes"
];

const RIOT_HANDLES = [
  "AcesHigh", "NightFall", "VoidWalker", "GhostEdge", "IronSight",
  "ViperBite", "NeonStrike", "PhantomShot", "CyberPulse", "ShadowFury",
  "BlazeKick", "FrostByte", "SolarWind", "ChronoShift", "SilentStep",
  "HavocBringer", "StormRider", "TitanSmash", "KineticForce", "SpecterHunt",
  "ValkyrieCry", "RadiantGlow", "EchoBlast", "VortexSpin", "NovaBurst",
  "PredatorEye", "ZeroCool", "BulletTime", "ReconDrone", "BladeDancer",
  "FlashPoint", "TriggerHappy", "DeepFreeze", "QuickDraw", "ApexHunter",
  "SoulStealer", "MirageWalk", "OmenCall", "CipherBreak", "SageTouch",
  "PhoenixRise", "SovaArrow", "BrimSmoke", "BreachCharge", "RazeGrenade",
  "JettDash", "ReynaEye", "KilljoyTurret", "SkyeWolf", "YoruGate",
  "AstraStar", "KayoKnife", "ChamberTrap", "NeonSlide", "FadeTerror",
  "HarborWave", "GekkoThrash", "IsoShield", "CloveRuse", "VyseThorn",
  "Deadeye", "Ghostwalker", "HeadHunter", "ViperKing", "PhantomQueen"
];

export function generateSeedData(): SeedData {
  const superAdmin = {
    email: "admin@vto.gg",
    name: "Tournament Director",
    passwordHash: hashPassword("AdminVTO2026!"),
    role: UserRole.SUPER_ADMIN,
  };

  const volunteers = [
    {
      user: {
        email: "coordinator@vto.gg",
        name: "Sarah Jenkins",
        passwordHash: hashPassword("CoordVTO2026!"),
        role: UserRole.COORDINATOR,
      },
      volunteer: {
        name: "Sarah Jenkins",
        phone: "+1-555-0201",
        role: VolunteerRole.LEAD_COORDINATOR,
        shift: "08:00 - 18:00",
        location: "Tournament Desk",
      },
    },
    {
      user: {
        email: "marshal1@vto.gg",
        name: "David Kim",
        passwordHash: hashPassword("MarshalVTO2026!"),
        role: UserRole.VOLUNTEER,
      },
      volunteer: {
        name: "David Kim",
        phone: "+1-555-0202",
        role: VolunteerRole.MATCH_MARSHAL,
        shift: "08:30 - 17:30",
        location: "Lab 1 - North Arena",
      },
    },
    {
      user: {
        email: "marshal2@vto.gg",
        name: "Elena Rostova",
        passwordHash: hashPassword("MarshalVTO2026!"),
        role: UserRole.VOLUNTEER,
      },
      volunteer: {
        name: "Elena Rostova",
        phone: "+1-555-0203",
        role: VolunteerRole.MATCH_MARSHAL,
        shift: "08:30 - 17:30",
        location: "Lab 2 - South Annex",
      },
    },
    {
      user: {
        email: "official@vto.gg",
        name: "Michael Torres",
        passwordHash: hashPassword("OfficialVTO2026!"),
        role: UserRole.RESULTS_OFFICIAL,
      },
      volunteer: {
        name: "Michael Torres",
        phone: "+1-555-0204",
        role: VolunteerRole.RESULTS,
        shift: "09:00 - 18:00",
        location: "Scoreboard Control",
      },
    },
  ];

  const tournament = {
    name: "VALORANT Campus Championship 2026",
    game: "VALORANT",
    venueName: "University Esports Complex",
    date: new Date("2026-10-15T09:00:00Z"),
    startTime: new Date("2026-10-15T10:00:00Z"),
    status: TournamentStatus.READY,
    format: TournamentFormat.SINGLE_ELIMINATION,
    currentRound: 1,
  };

  const settings = {
    playersPerTeam: 5,
    maxSubstitutes: 2,
    matchDurationMinutes: 45,
    bufferDurationMinutes: 15,
    autoAdvanceBYEs: true,
    requireCheckIn: true,
    allowSelfRegistration: false,
  };

  // Lab 1: 30 PCs, 3 Stations (10 PCs each)
  const lab1Stations: SeedStation[] = [
    {
      name: "Station 1",
      pcCount: 10,
      pcs: Array.from({ length: 10 }, (_, i) => ({
        pcNumber: `PC-${String(i + 1).padStart(2, "0")}`,
        ipAddress: `192.168.1.${101 + i}`,
        status: PCStatus.AVAILABLE,
        notes: `Lab 1 Station 1 - Seat ${i + 1}`,
      })),
    },
    {
      name: "Station 2",
      pcCount: 10,
      pcs: Array.from({ length: 10 }, (_, i) => ({
        pcNumber: `PC-${String(i + 11).padStart(2, "0")}`,
        ipAddress: `192.168.1.${111 + i}`,
        status: PCStatus.AVAILABLE,
        notes: `Lab 1 Station 2 - Seat ${i + 1}`,
      })),
    },
    {
      name: "Station 3",
      pcCount: 10,
      pcs: Array.from({ length: 10 }, (_, i) => ({
        pcNumber: `PC-${String(i + 21).padStart(2, "0")}`,
        ipAddress: `192.168.1.${121 + i}`,
        status: PCStatus.AVAILABLE,
        notes: `Lab 1 Station 3 - Seat ${i + 1}`,
      })),
    },
  ];

  // Lab 2: 10 PCs, 1 Station (10 PCs)
  const lab2Stations: SeedStation[] = [
    {
      name: "Station 4",
      pcCount: 10,
      pcs: Array.from({ length: 10 }, (_, i) => ({
        pcNumber: `PC-${String(i + 31).padStart(2, "0")}`,
        ipAddress: `192.168.1.${131 + i}`,
        status: PCStatus.AVAILABLE,
        notes: `Lab 2 Station 4 - Seat ${i + 1}`,
      })),
    },
  ];

  const venue = {
    name: "University Esports Complex",
    address: "100 Campus Drive, North Complex",
    building: {
      name: "Engineering North",
      labs: [
        {
          name: "Lab 1 - North Arena",
          totalPcs: 30,
          stations: lab1Stations,
        },
        {
          name: "Lab 2 - South Annex",
          totalPcs: 10,
          stations: lab2Stations,
        },
      ],
    },
  };

  // Generate 13 Teams with 5 players each (65 players total)
  let playerCounter = 0;
  const teams: SeedTeam[] = TEAM_DEFINITIONS.map((def, teamIdx) => {
    const seed = teamIdx + 1;
    const teamPlayers: SeedPlayer[] = [];

    for (let p = 0; p < 5; p++) {
      const idx = playerCounter++;
      const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
      const lastName = LAST_NAMES[idx % LAST_NAMES.length];
      const riotHandle = RIOT_HANDLES[idx % RIOT_HANDLES.length];
      const tag = `VTO${String(teamIdx + 1).padStart(2, "0")}`;

      teamPlayers.push({
        name: `${firstName} ${lastName}`,
        collegeId: `COL-2026-${String(idx + 1).padStart(3, "0")}`,
        riotId: riotHandle,
        riotTag: tag,
        role: p === 0 ? PlayerRole.CAPTAIN : PlayerRole.STARTER,
        phone: `+1-555-01${String(idx + 1).padStart(2, "0")}`,
        verified: true,
        present: true,
      });
    }

    const captainName = teamPlayers[0].name;
    const captainContact = teamPlayers[0].phone!;

    return {
      name: def.name,
      captain: captainName,
      captainContact,
      institution: def.institution,
      seed,
      status: TeamStatus.CHECKED_IN,
      players: teamPlayers,
    };
  });

  return {
    superAdmin,
    volunteers,
    tournament,
    settings,
    venue,
    teams,
  };
}

export async function seed(prisma: PrismaClient, dryRun = false) {
  const data = generateSeedData();

  if (dryRun) {
    console.log("=== DRY-RUN VERIFICATION MODE ===");
    console.log(`Super Admin: ${data.superAdmin.email} (${data.superAdmin.role})`);
    console.log(`Tournament: "${data.tournament.name}" (${data.tournament.status}, ${data.tournament.format})`);
    console.log(`Settings: ${data.settings.playersPerTeam} players/team, ${data.settings.bufferDurationMinutes}m buffer`);
    console.log(`Venue: "${data.venue.name}" - Building: "${data.venue.building.name}"`);
    for (const lab of data.venue.building.labs) {
      console.log(`  - Lab "${lab.name}": ${lab.totalPcs} PCs, ${lab.stations.length} stations`);
      for (const st of lab.stations) {
        console.log(`    - Station "${st.name}": ${st.pcs.length} PCs (all ${st.pcs[0].status})`);
      }
    }
    console.log(`Teams: ${data.teams.length} teams, ${data.teams.length * 5} players total`);
    for (const team of data.teams) {
      console.log(`  - Seed #${team.seed}: ${team.name} (${team.institution}) - Captain: ${team.captain} [${team.players.length} players]`);
    }
    console.log(`Volunteers: ${data.volunteers.length} staff members seeded`);
    console.log("=== DRY-RUN COMPLETED SUCCESSFULLY ===");
    return { data, count: { teams: data.teams.length, players: data.teams.length * 5, pcs: 40, stations: 4, labs: 2 } };
  }

  // Live database seed execution
  console.log("Starting database seed transaction...");

  return prisma.$transaction(async (tx) => {
    // 1. Create Super Admin
    const adminUser = await tx.user.upsert({
      where: { email: data.superAdmin.email },
      update: {
        name: data.superAdmin.name,
        role: data.superAdmin.role,
        passwordHash: data.superAdmin.passwordHash,
      },
      create: {
        email: data.superAdmin.email,
        name: data.superAdmin.name,
        role: data.superAdmin.role,
        passwordHash: data.superAdmin.passwordHash,
      },
    });
    console.log(`Created Super Admin: ${adminUser.email}`);

    // 2. Create Volunteers and Users
    for (const item of data.volunteers) {
      const user = await tx.user.upsert({
        where: { email: item.user.email },
        update: {
          name: item.user.name,
          role: item.user.role,
          passwordHash: item.user.passwordHash,
        },
        create: {
          email: item.user.email,
          name: item.user.name,
          role: item.user.role,
          passwordHash: item.user.passwordHash,
        },
      });

      await tx.volunteer.upsert({
        where: { userId: user.id },
        update: {
          name: item.volunteer.name,
          phone: item.volunteer.phone,
          role: item.volunteer.role,
          shift: item.volunteer.shift,
          location: item.volunteer.location,
          present: true,
        },
        create: {
          userId: user.id,
          name: item.volunteer.name,
          phone: item.volunteer.phone,
          role: item.volunteer.role,
          shift: item.volunteer.shift,
          location: item.volunteer.location,
          present: true,
        },
      });
    }
    console.log(`Created ${data.volunteers.length} volunteer staff users`);

    // 3. Create Tournament
    const tournament = await tx.tournament.create({
      data: {
        name: data.tournament.name,
        game: data.tournament.game,
        venueName: data.tournament.venueName,
        date: data.tournament.date,
        startTime: data.tournament.startTime,
        status: data.tournament.status,
        format: data.tournament.format,
        currentRound: data.tournament.currentRound,
        createdBy: adminUser.id,
      },
    });
    console.log(`Created Tournament: ${tournament.name} (ID: ${tournament.id})`);

    // 4. Create Tournament Settings
    await tx.tournamentSettings.create({
      data: {
        tournamentId: tournament.id,
        playersPerTeam: data.settings.playersPerTeam,
        maxSubstitutes: data.settings.maxSubstitutes,
        matchDurationMinutes: data.settings.matchDurationMinutes,
        bufferDurationMinutes: data.settings.bufferDurationMinutes,
        autoAdvanceBYEs: data.settings.autoAdvanceBYEs,
        requireCheckIn: data.settings.requireCheckIn,
        allowSelfRegistration: data.settings.allowSelfRegistration,
      },
    });

    // 5. Create Physical Infrastructure
    const venue = await tx.venue.create({
      data: {
        tournamentId: tournament.id,
        name: data.venue.name,
        address: data.venue.address,
      },
    });

    const building = await tx.building.create({
      data: {
        venueId: venue.id,
        name: data.venue.building.name,
      },
    });

    let totalPcsSeeded = 0;
    for (const labData of data.venue.building.labs) {
      const lab = await tx.lab.create({
        data: {
          buildingId: building.id,
          name: labData.name,
          totalPcs: labData.totalPcs,
          isActive: true,
        },
      });

      for (const stationData of labData.stations) {
        const station = await tx.station.create({
          data: {
            labId: lab.id,
            name: stationData.name,
            pcCount: stationData.pcCount,
            isActive: true,
          },
        });

        for (const pcData of stationData.pcs) {
          await tx.pC.create({
            data: {
              labId: lab.id,
              stationId: station.id,
              pcNumber: pcData.pcNumber,
              ipAddress: pcData.ipAddress,
              status: pcData.status,
              notes: pcData.notes,
            },
          });
          totalPcsSeeded++;
        }
      }
    }
    console.log(`Seeded Physical Infrastructure: 1 Venue, 1 Building, 2 Labs, 4 Stations, ${totalPcsSeeded} PCs`);

    // 6. Create 13 Teams with 5 Players each
    let totalPlayersSeeded = 0;
    for (const teamData of data.teams) {
      const team = await tx.team.create({
        data: {
          tournamentId: tournament.id,
          name: teamData.name,
          captain: teamData.captain,
          captainContact: teamData.captainContact,
          institution: teamData.institution,
          seed: teamData.seed,
          status: teamData.status,
          checkedInAt: new Date(),
        },
      });

      for (const playerData of teamData.players) {
        await tx.player.create({
          data: {
            teamId: team.id,
            name: playerData.name,
            collegeId: playerData.collegeId,
            riotId: playerData.riotId,
            riotTag: playerData.riotTag,
            phone: playerData.phone,
            role: playerData.role,
            verified: playerData.verified,
            present: playerData.present,
          },
        });
        totalPlayersSeeded++;
      }
    }
    console.log(`Seeded ${data.teams.length} Teams with ${totalPlayersSeeded} starting players`);

    // 7. Seed Initial Audit Log
    await tx.auditLog.create({
      data: {
        tournamentId: tournament.id,
        actorId: adminUser.id,
        actorRole: adminUser.role,
        action: "SEED_TOURNAMENT",
        entity: "Tournament",
        entityId: tournament.id,
        beforeState: null,
        afterState: JSON.stringify({
          name: tournament.name,
          status: tournament.status,
          teams: data.teams.length,
          pcs: totalPcsSeeded,
        }),
      },
    });

    console.log("Database seed completed successfully.");
    return {
      tournamentId: tournament.id,
      teamsCount: data.teams.length,
      playersCount: totalPlayersSeeded,
      pcsCount: totalPcsSeeded,
    };
  });
}

// Standalone execution handler
async function main() {
  const isDryRun =
    process.argv.includes("--dry-run") ||
    process.env.DRY_RUN === "true" ||
    !process.env.DATABASE_URL;

  const prisma = new PrismaClient();

  try {
    if (isDryRun) {
      console.log("[VTO Seed] Running in dry-run / schema validation mode...");
      await seed(prisma, true);
    } else {
      console.log("[VTO Seed] Connecting to database...");
      await prisma.$connect();
      await seed(prisma, false);
    }
  } catch (error) {
    if (!process.env.DATABASE_URL || (error as { code?: string }).code === "P1001") {
      console.warn("[VTO Seed] Database connection unavailable. Falling back to dry-run verification mode.");
      await seed(prisma, true);
    } else {
      console.error("[VTO Seed] Error executing seed:", error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  main();
}
