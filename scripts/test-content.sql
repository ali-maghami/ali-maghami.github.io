-- Fixture content for running the built site without the production database:
-- one of everything, referencing files committed under public/. Applied after
-- scripts/test-database.sql by the CI smoke test, and useful locally:
--
--   psql "$URL" -v ON_ERROR_STOP=1 -f scripts/test-database.sql -f scripts/test-content.sql
--   PORTFOLIO_DATABASE_URL="$URL" node dist/server/entry.mjs
--
-- tests/smoke.test.ts knows the slugs below.

INSERT INTO portfolio_setting (key, value) VALUES ('site', '{
	"siteTitle": "Ali Maghami",
	"siteDescription": "Ali Maghami - Computer Vision, AI, Robotics",
	"social": {
		"github": "https://github.com/ali-maghami",
		"linkedin": "https://www.linkedin.com/in/samaghami/",
		"scholar": "https://scholar.google.com/citations?user=eoH8oF0AAAAJ",
		"email": "hello@example.com"
	},
	"footerBadges": { "limit": 3, "pages": ["home", "about"] }
}');

INSERT INTO portfolio_page (key, data, body_markdown) VALUES ('home', '{
	"heading": "Building AI for the physical world.",
	"focusAreas": ["AI & Physical AI", "Computer Vision", "Robotics"],
	"portrait": "/portrait/Untitled - September 02, 2026 at 19.02.02.png",
	"portraitSize": 250,
	"projectCount": 4,
	"postCount": 5,
	"now": "Leading vision and AI applications at Hatch, Ontario",
	"since": 2015
}', E'I’m **Ali**, an engineer and researcher working across AI, computer vision, robotics, and systems architecture. I build intelligent systems that connect perception, intelligence, and action.\n\nHere, I share ideas and lessons about [Physical AI](/about/), technical leadership, and turning emerging technologies into practical solutions.');

INSERT INTO portfolio_page (key, data, body_markdown) VALUES ('about', '{
	"title": "Ali Maghami",
	"eyebrow": "About",
	"standfirst": "Building AI for the physical world.",
	"skills": [{ "area": "Computer Vision", "detail": "2D and 3D vision, stereo imaging, tracking" }],
	"education": [{ "label": "PhD", "detail": "University of Manitoba" }]
}', E'I’m an engineer, researcher, and technical leader.\n\n## Background\n\nMore than ten years across engineering, industrial automation, robotics, and applied AI.');

INSERT INTO portfolio_post (slug, title, description, pub_date, tags, kind, hero_image, body_markdown, status) VALUES
	('teaching-steel-industry-equipment-to-see', 'Teaching Steel Industry Equipment to See',
	 'A practical look at how AI, computer vision, and deterministic geometry can work together.',
	 '2026-09-04', '{"Computer Vision","Industrial AI","Edge AI"}', 'Post', '/hero/herocoilbox.webp',
	 E'*`Images are AI-generated and used for illustrative purposes.`*\n\nImagine a steel mill producing a very long, hot strip of steel.\n\n![A Coilbox winding hot steel strip into a coil](/media/coilsense-coilbox.jpg)\n\n## Giving the machine another sensor\n\nCameras provide the raw data. AI extracts important features.\n\n![hero: The perception pipeline](/media/coilsense-perception-pipeline.jpg)\n\nThat difference matters.',
	 'published');

INSERT INTO portfolio_post (slug, title, description, pub_date, tags, kind, hero_video, hero_video_playback, body_markdown, status) VALUES
	('fourteen-agents-one-trace-observability-for-multi-agent-systems', 'Fourteen Agents, One Trace: Observability for Multi-Agent Systems',
	 'When multiple AI agents collaborate, separate logs cannot explain the complete workflow.',
	 '2026-09-03', '{"AI Observability","LLMOps"}', 'Post', '/hero/ai-observability-animated.mp4', 'loop',
	 E'Effective observability requires a shared trace that follows each request across agents, tools, and handoffs.',
	 'published');

INSERT INTO portfolio_post (slug, title, description, pub_date, body_markdown, status) VALUES
	('a-draft', 'A draft', 'Not yet.', '2026-09-05', 'Draft body.', 'draft');

INSERT INTO portfolio_project (slug, title, description, stage, category, contributors, purpose, pub_date, tags, hero_image, card_color, card_color_alt, body_markdown, status) VALUES
	('coilsense', 'CoilSense', 'Real-time vision for a steel coilbox', 'piloted', 'active', '{"Sina Alborzi"}',
	 'Using computer vision and AI to help a steel-processing machine understand what is happening around it in real time.',
	 '2025-06-01', '{"Computer Vision","Industrial AI","Edge AI"}', '/media/herocoilbox.webp', '#c66fb0', '#4f7f5f',
	 E'CoilSense is a real-time computer-vision system developed to give heavy industrial equipment visual awareness.',
	 'published');

INSERT INTO portfolio_project (slug, title, description, stage, category, pub_date, tags, card_color, body_markdown, status) VALUES
	('hatch-coating-vision', 'StripSense', 'Measuring Reflective Surfaces with Stereo Vision', 'piloted', 'active',
	 '2024-12-01', '{"Computer Vision","Stereo Vision"}', '#4f95cf',
	 E'Words first.\n\n![The coating rig](/media/hatch-coating-vision-hero.webp)\n\nThen more words.',
	 'published'),
	('railcar-vision-inspection', 'Automated Railcar Vision & Inspection System', 'Large-scale vision platform integrating 40+ cameras.',
	 'research-prototype', 'archived', '2024-06-01', '{"Computer Vision"}', '#f0b34a', 'No image in this one.', 'published');

INSERT INTO portfolio_paper (slug, title, authors, venue, year, kind, abstract, doi, tags, status) VALUES
	('robotica-2024', 'Vision-based target localization and online error correction for high-precision robotic drilling',
	 'A Maghami', 'Robotica', 2024, 'journal', 'A stereo-vision system tracks circular targets and measures the 6D pose of the robot and workpiece.',
	 '10.1017/S0263574724001255', '{"Robotics","Computer Vision"}', 'published'),
	('coating-patent', 'Vision method and system for coating processes and systems', 'Ali MAGHAMI, Maurizio Darini, Ivan MARINCIC, Ammaar ZIA',
	 'WIPO (PCT)', 2025, 'patent', 'Computer vision and projected light patterns measure the position and shape of metal strips during coating.',
	 NULL, '{"Computer Vision","Stereo Vision"}', 'published');

INSERT INTO portfolio_certificate (slug, name, issuer, issue_date, url, badge, featured, status) VALUES
	('aws-saa', 'AWS Certified Solutions Architect – Associate', 'Amazon Web Services (AWS)', '2025-01-01',
	 'https://www.credly.com/badges/example/public_url', '/badges/aws-certified-solutions-architect-associate.png', true, 'published'),
	('pmp', 'Project Management Professional (PMP)®', 'Project Management Institute', '2024-06-01',
	 NULL, '/badges/project-management-professional-pmp.png', true, 'published');

INSERT INTO portfolio_media (path, original_name, mime_type, byte_size, checksum_sha256, width, height) VALUES
	('/uploads/123e4567-e89b-12d3-a456-426614174000.webp', 'rig.webp', 'image/webp', 12345, 'fixture', 1200, 800);
