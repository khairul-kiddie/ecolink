import { PrismaClient, UserRole, ProgrammeStatus, RelationshipStatus, RelationshipType, MatchStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding EcoLink database...');

  // System configs
  await prisma.systemConfig.createMany({
    data: [
      { key: 'max_match_proposals_per_company', value: 5, description: 'Max AI match proposals per company' },
      { key: 'embedding_model', value: '"text-embedding-004"', description: 'Google embedding model' },
      { key: 'match_refresh_interval_days', value: 7, description: 'Days between auto-match refreshes' },
    ],
    skipDuplicates: true,
  });

  // Super Admin
  const adminPassword = await hash('Admin@123456');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecolink.app' },
    update: {},
    create: {
      email: 'admin@ecolink.app',
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
      firstName: 'System',
      lastName: 'Admin',
      isEmailVerified: true,
    },
  });

  // Programme Owners
  const testPassword = await hash('Test@123456');

  const owner1 = await prisma.user.upsert({
    where: { email: 'owner1@ecolink.app' },
    update: {},
    create: {
      email: 'owner1@ecolink.app',
      passwordHash: testPassword,
      role: UserRole.PROGRAMME_OWNER,
      status: 'ACTIVE',
      firstName: 'Amirah',
      lastName: 'Hassan',
      isEmailVerified: true,
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner2@ecolink.app' },
    update: {},
    create: {
      email: 'owner2@ecolink.app',
      passwordHash: testPassword,
      role: UserRole.PROGRAMME_OWNER,
      status: 'ACTIVE',
      firstName: 'Razif',
      lastName: 'Zainal',
      isEmailVerified: true,
    },
  });

  // Programmes
  const programme1 = await prisma.programme.create({
    data: {
      name: 'Cradle CIP Catalyst 2026',
      description: 'Accelerating deep tech and digital innovation startups in Malaysia.',
      objectives: ['Market validation', 'Business development', 'Fundraising readiness'],
      targetIndustries: ['fintech', 'deeptech', 'healthtech', 'agritech'],
      targetStages: ['pre-seed', 'seed'],
      country: 'Malaysia',
      city: 'Kuala Lumpur',
      status: ProgrammeStatus.OPEN,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-12-31'),
      maxCompanies: 20,
      ownerId: owner1.id,
      applicationDeadline: new Date('2026-06-15'),
      benefits: ['RM150k grant', 'Mentorship', 'Investor access', 'Co-working space'],
      requirements: ['Malaysian registered company', 'Tech-based product', 'Team of 2+'],
    },
  });

  const programme2 = await prisma.programme.create({
    data: {
      name: 'Malaysia Digital Economy Accelerator',
      description: 'Supporting e-commerce and logistics tech startups to scale.',
      objectives: ['Product-market fit', 'Revenue growth', 'Partnership development'],
      targetIndustries: ['e-commerce', 'logistics', 'retail'],
      targetStages: ['seed', 'series-a'],
      country: 'Malaysia',
      city: 'Cyberjaya',
      status: ProgrammeStatus.IN_PROGRESS,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      maxCompanies: 15,
      ownerId: owner2.id,
      benefits: ['Mentorship', 'Market access', 'Government procurement opportunities'],
      requirements: ['Bumiputera-founded preferred', 'Revenue-generating', 'Digital product'],
    },
  });

  // Mentors (10)
  const mentorData = [
    { email: 'mentor.fintech@ecolink.app', firstName: 'Khairul', lastName: 'Azmi', expertise: ['fintech', 'payments', 'regulatory-compliance'], industries: ['fintech', 'banking'], bio: 'Former VP at Maybank with 15 years in digital banking and fintech regulation.', yearsExperience: 15, availabilityHours: 8 },
    { email: 'mentor.deeptech@ecolink.app', firstName: 'Priya', lastName: 'Krishnamurthy', expertise: ['AI/ML', 'computer-vision', 'IoT'], industries: ['deeptech', 'manufacturing'], bio: 'AI researcher turned entrepreneur. PhD from UTM, built and exited two AI startups.', yearsExperience: 12, availabilityHours: 6 },
    { email: 'mentor.sustainability@ecolink.app', firstName: 'Ahmad', lastName: 'Fauzi', expertise: ['ESG', 'sustainability', 'carbon-markets'], industries: ['sustainability', 'energy', 'agritech'], bio: 'Sustainability consultant for Fortune 500 companies and SEA governments.', yearsExperience: 10, availabilityHours: 4 },
    { email: 'mentor.ecommerce@ecolink.app', firstName: 'Lim', lastName: 'Wei Ling', expertise: ['e-commerce', 'marketplace', 'SEO', 'digital-marketing'], industries: ['e-commerce', 'retail', 'FMCG'], bio: 'Co-founded and scaled an e-commerce platform to RM50M GMV before acquisition.', yearsExperience: 8, availabilityHours: 6 },
    { email: 'mentor.logistics@ecolink.app', firstName: 'Rajan', lastName: 'Sundaram', expertise: ['supply-chain', 'logistics', 'last-mile-delivery'], industries: ['logistics', 'transportation', 'e-commerce'], bio: 'Operations director at a leading 3PL company, now advising logistics startups.', yearsExperience: 14, availabilityHours: 4 },
    { email: 'mentor.healthtech@ecolink.app', firstName: 'Dr. Nurul', lastName: 'Huda', expertise: ['healthtech', 'telemedicine', 'medical-devices'], industries: ['healthtech', 'pharmaceutical'], bio: 'Medical doctor turned health tech entrepreneur. Built Malaysia\'s first AI diagnostics platform.', yearsExperience: 11, availabilityHours: 6 },
    { email: 'mentor.edtech@ecolink.app', firstName: 'James', lastName: 'Wong', expertise: ['edtech', 'curriculum-design', 'ed-product'], industries: ['edtech', 'education'], bio: 'Former MOE curriculum director who pivoted to ed-tech. Built platforms used by 500k students.', yearsExperience: 16, availabilityHours: 8 },
    { email: 'mentor.agritech@ecolink.app', firstName: 'Siti', lastName: 'Aminah', expertise: ['agritech', 'precision-farming', 'food-security'], industries: ['agritech', 'food', 'sustainability'], bio: 'Agricultural economist with deep expertise in smart farming and food supply chains.', yearsExperience: 9, availabilityHours: 4 },
    { email: 'mentor.creative@ecolink.app', firstName: 'Farid', lastName: 'Ismail', expertise: ['creative-economy', 'content', 'IP-monetisation', 'Web3'], industries: ['creative', 'media', 'entertainment'], bio: 'Serial creative entrepreneur. Produced award-winning content and built creator monetisation platforms.', yearsExperience: 7, availabilityHours: 6 },
    { email: 'mentor.retail@ecolink.app', firstName: 'Celine', lastName: 'Tan', expertise: ['retail', 'brand-building', 'omnichannel', 'consumer-insights'], industries: ['retail', 'FMCG', 'fashion'], bio: 'Retail consultant who helped 30+ brands expand across SEA. Former buyer at Parkson.', yearsExperience: 13, availabilityHours: 6 },
  ];

  const mentors = [];
  for (const data of mentorData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: testPassword,
        role: UserRole.MENTOR,
        status: 'ACTIVE',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: true,
      },
    });

    const profile = await prisma.mentorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: data.bio,
        expertise: data.expertise,
        industries: data.industries,
        yearsExperience: data.yearsExperience,
        availabilityHours: data.availabilityHours,
        isVerified: true,
        verifiedAt: new Date(),
        maxMentees: 3,
      },
    });
    mentors.push({ user, profile });
  }

  // Companies (15)
  const companyData = [
    { email: 'co.finpay@ecolink.app', firstName: 'Hafizuddin', lastName: 'Razak', companyName: 'FinPay Solutions', industry: 'fintech', stage: 'pre-seed', description: 'B2B payment gateway for SMEs in Malaysia.', problem: 'SMEs lack affordable payment infrastructure.', needsTags: ['fintech-mentorship', 'regulatory-guidance', 'fundraising'] },
    { email: 'co.agrobot@ecolink.app', firstName: 'Nurul', lastName: 'Azizah', companyName: 'AgroBot Malaysia', industry: 'agritech', stage: 'seed', description: 'Autonomous drones for paddy field monitoring.', problem: 'Farmers lack affordable crop monitoring tools.', needsTags: ['agritech-mentorship', 'hardware-manufacturing', 'grant-writing'] },
    { email: 'co.healio@ecolink.app', firstName: 'Brendan', lastName: 'Lee', companyName: 'Healio', industry: 'healthtech', stage: 'seed', description: 'AI-powered chronic disease management app.', problem: 'Chronic disease patients lack continuous care support.', needsTags: ['healthtech-mentorship', 'medical-regulation', 'partnerships'] },
    { email: 'co.studypal@ecolink.app', firstName: 'Afiqah', lastName: 'Mohd', companyName: 'StudyPal', industry: 'edtech', stage: 'pre-seed', description: 'Personalised tutoring platform for SPM students.', problem: 'Quality tuition is unaffordable for rural students.', needsTags: ['edtech-mentorship', 'content-creation', 'growth-hacking'] },
    { email: 'co.ecopack@ecolink.app', firstName: 'Marcus', lastName: 'Ong', companyName: 'EcoPack Ventures', industry: 'sustainability', stage: 'pre-seed', description: 'Biodegradable packaging for F&B industry.', problem: 'Single-use plastic waste from food packaging.', needsTags: ['sustainability-strategy', 'manufacturing-scale', 'ESG-reporting'] },
    { email: 'co.shipzap@ecolink.app', firstName: 'Roshini', lastName: 'Devi', companyName: 'ShipZap', industry: 'logistics', stage: 'seed', description: 'Same-day delivery network using gig economy riders.', problem: 'Last-mile delivery is slow and expensive for SMEs.', needsTags: ['logistics-operations', 'tech-scaling', 'fundraising'] },
    { email: 'co.craftly@ecolink.app', firstName: 'Syahril', lastName: 'Baharum', companyName: 'Craftly', industry: 'creative', stage: 'pre-seed', description: 'Marketplace for Malaysian artisan products.', problem: 'Local artisans cannot access national/global markets.', needsTags: ['e-commerce', 'brand-building', 'marketplace-operations'] },
    { email: 'co.farmmind@ecolink.app', firstName: 'Kalai', lastName: 'Selvan', companyName: 'FarmMind', industry: 'agritech', stage: 'seed', description: 'Soil intelligence platform for precision agriculture.', problem: 'Farmers lack actionable data to optimise yields.', needsTags: ['agritech-mentorship', 'IoT', 'B2G-sales'] },
    { email: 'co.careai@ecolink.app', firstName: 'Fiona', lastName: 'Chong', companyName: 'CareAI', industry: 'healthtech', stage: 'series-a', description: 'Hospital workflow automation using computer vision.', problem: 'Hospitals waste hours on manual documentation.', needsTags: ['AI/ML', 'enterprise-sales', 'regulatory-approval'] },
    { email: 'co.gridx@ecolink.app', firstName: 'Azlan', lastName: 'Shah', companyName: 'GridX Energy', industry: 'sustainability', stage: 'seed', description: 'Community solar microgrids for rural Malaysia.', problem: 'Energy poverty in Sabah and Sarawak rural areas.', needsTags: ['sustainability', 'project-finance', 'government-engagement'] },
    { email: 'co.retailscan@ecolink.app', firstName: 'Loh', lastName: 'Pei Shan', companyName: 'RetailScan', industry: 'retail', stage: 'pre-seed', description: 'AI shelf analytics for retail chains.', problem: 'Out-of-stock and planogram compliance costs billions.', needsTags: ['retail-industry', 'computer-vision', 'enterprise-sales'] },
    { email: 'co.chatbot@ecolink.app', firstName: 'Daniel', lastName: 'Tan', companyName: 'Botify MY', industry: 'deeptech', stage: 'pre-seed', description: 'Malay-language conversational AI for SMEs.', problem: 'SMEs lack affordable multilingual chatbot solutions.', needsTags: ['AI/ML', 'NLP', 'B2B-sales'] },
    { email: 'co.sendmoney@ecolink.app', firstName: 'Yasmin', lastName: 'Ibrahim', companyName: 'RemitGo', industry: 'fintech', stage: 'seed', description: 'Mobile remittance for migrant workers in Malaysia.', problem: 'High fees and slow transfers hurt migrant worker families.', needsTags: ['fintech', 'regulatory-compliance', 'community-marketing'] },
    { email: 'co.farmmarket@ecolink.app', firstName: 'Tengku', lastName: 'Amirul', companyName: 'FreshLink', industry: 'e-commerce', stage: 'seed', description: 'Direct farm-to-consumer marketplace.', problem: 'Price gap between farm gate and consumer prices.', needsTags: ['marketplace', 'cold-chain-logistics', 'community-building'] },
    { email: 'co.fitloop@ecolink.app', firstName: 'Sharifah', lastName: 'Nadiah', companyName: 'FitLoop', industry: 'healthtech', stage: 'pre-seed', description: 'AI personal trainer app with injury prevention.', problem: 'Most fitness apps ignore injury risk and proper form.', needsTags: ['healthtech', 'app-development', 'user-acquisition'] },
  ];

  const companies = [];
  for (const data of companyData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: testPassword,
        role: UserRole.COMPANY_REP,
        status: 'ACTIVE',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: true,
      },
    });

    const profile = await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyName: data.companyName,
        industry: data.industry,
        stage: data.stage,
        description: data.description,
        problem: data.problem,
        needsTags: data.needsTags,
        country: 'Malaysia',
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    companies.push({ user, profile });
  }

  // Partners (3)
  const partnerData = [
    { email: 'partner.vc@ecolink.app', firstName: 'Chandran', lastName: 'Nair', orgName: 'Axiata Digital Innovation Fund', orgType: 'VC', focusAreas: ['fintech', 'deeptech', 'sustainability'] },
    { email: 'partner.gov@ecolink.app', firstName: 'Dato', lastName: "Seri Azmi", orgName: 'MDEC', orgType: 'government', focusAreas: ['digital-economy', 'e-commerce', 'AI'] },
    { email: 'partner.corp@ecolink.app', firstName: 'Karen', lastName: 'Teoh', orgName: 'Maxis Innovation Lab', orgType: 'corporate', focusAreas: ['IoT', 'connectivity', 'enterprise-tech'] },
  ];

  for (const data of partnerData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: testPassword,
        role: UserRole.PARTNER,
        status: 'ACTIVE',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: true,
      },
    });

    await prisma.partnerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        orgName: data.orgName,
        orgType: data.orgType,
        focusAreas: data.focusAreas,
        country: 'Malaysia',
        isVerified: true,
      },
    });
  }

  // Service Providers (2)
  const spData = [
    { email: 'sp.legal@ecolink.app', firstName: 'Rashid', lastName: 'Harun', orgName: 'Rashid & Partners Legal', serviceTypes: ['legal', 'IP', 'corporate'] },
    { email: 'sp.accounting@ecolink.app', firstName: 'Grace', lastName: 'Lim', orgName: 'GraceLim Accountants', serviceTypes: ['accounting', 'tax', 'audit', 'CFO-services'] },
  ];

  for (const data of spData) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: testPassword,
        role: UserRole.SERVICE_PROVIDER,
        status: 'ACTIVE',
        firstName: data.firstName,
        lastName: data.lastName,
        isEmailVerified: true,
      },
    });

    await prisma.serviceProviderProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        orgName: data.orgName,
        serviceTypes: data.serviceTypes,
        country: 'Malaysia',
        isVerified: true,
      },
    });
  }

  // Programme Applications
  for (let i = 0; i < 6; i++) {
    const company = companies[i];
    await prisma.programmeApplication.upsert({
      where: { programmeId_companyId: { programmeId: programme1.id, companyId: company.profile.id } },
      update: {},
      create: {
        programmeId: programme1.id,
        companyId: company.profile.id,
        status: i < 4 ? 'APPROVED' : 'PENDING',
        applicationData: { motivation: 'Looking to scale with the right support.' },
        reviewedAt: i < 4 ? new Date() : null,
        reviewedById: i < 4 ? owner1.id : null,
      },
    });
  }

  for (let i = 6; i < 11; i++) {
    const company = companies[i];
    await prisma.programmeApplication.upsert({
      where: { programmeId_companyId: { programmeId: programme2.id, companyId: company.profile.id } },
      update: {},
      create: {
        programmeId: programme2.id,
        companyId: company.profile.id,
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: owner2.id,
      },
    });
  }

  // Relationships (20)
  const relationshipPairs = [
    { mentorIdx: 0, companyIdx: 0, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 1, companyIdx: 1, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 2, companyIdx: 4, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 3, companyIdx: 6, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 4, companyIdx: 5, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 5, companyIdx: 2, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 6, companyIdx: 3, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 7, companyIdx: 7, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 8, companyIdx: 6, status: RelationshipStatus.COMPLETED, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 9, companyIdx: 10, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 0, companyIdx: 12, status: RelationshipStatus.PENDING_APPROVAL, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 5, companyIdx: 8, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 1, companyIdx: 11, status: RelationshipStatus.PROPOSED, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 2, companyIdx: 9, status: RelationshipStatus.PAUSED, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 3, companyIdx: 13, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 6, companyIdx: 14, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 4, companyIdx: 0, status: RelationshipStatus.TERMINATED, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 9, companyIdx: 6, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 7, companyIdx: 4, status: RelationshipStatus.PENDING_APPROVAL, type: RelationshipType.MENTOR_COMPANY },
    { mentorIdx: 8, companyIdx: 1, status: RelationshipStatus.ACTIVE, type: RelationshipType.MENTOR_COMPANY },
  ];

  for (const pair of relationshipPairs) {
    await prisma.relationship.create({
      data: {
        type: pair.type,
        status: pair.status,
        mentorId: mentors[pair.mentorIdx].profile.id,
        companyId: companies[pair.companyIdx].profile.id,
        initiatedById: admin.id,
        isAiGenerated: true,
        aiMatchScore: Math.random() * 0.3 + 0.65,
        aiRationale: 'AI matched based on expertise alignment and industry overlap.',
        startedAt: pair.status === RelationshipStatus.ACTIVE ? new Date('2026-02-01') : null,
        tags: ['programme', 'ai-matched'],
      },
    });
  }

  // Match Proposals (5 pending)
  const proposalPairs = [
    { mentorIdx: 0, companyIdx: 3 },
    { mentorIdx: 1, companyIdx: 5 },
    { mentorIdx: 3, companyIdx: 8 },
    { mentorIdx: 5, companyIdx: 11 },
    { mentorIdx: 7, companyIdx: 13 },
  ];

  for (const pair of proposalPairs) {
    const score = Math.random() * 0.2 + 0.7;
    await prisma.matchProposal.create({
      data: {
        mentorId: mentors[pair.mentorIdx].profile.id,
        companyId: companies[pair.companyIdx].profile.id,
        status: MatchStatus.PENDING,
        score,
        rationale: `High compatibility detected: mentor's expertise in ${mentors[pair.mentorIdx].profile.expertise[0]} directly addresses company's need for ${companies[pair.companyIdx].profile.needsTags[0]}.`,
        scoreBreakdown: {
          semanticSimilarity: score - 0.05,
          expertiseMatch: score + 0.02,
          industryAlignment: score - 0.1,
          availabilityScore: 0.8,
          pastEngagementBonus: 0,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('\n📋 Credentials:');
  console.log('  Super Admin:     admin@ecolink.app     / Admin@123456');
  console.log('  Programme Owner: owner1@ecolink.app    / Test@123456');
  console.log('  Programme Owner: owner2@ecolink.app    / Test@123456');
  console.log('  Mentor:          mentor.fintech@ecolink.app / Test@123456');
  console.log('  Company:         co.finpay@ecolink.app / Test@123456');
  console.log('  Partner:         partner.vc@ecolink.app / Test@123456');
  console.log('\n🌐 Services:');
  console.log('  API:     http://localhost:4000');
  console.log('  Docs:    http://localhost:4000/api/docs');
  console.log('  Frontend: http://localhost:3000');
  console.log('  Mailhog: http://localhost:8025');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
