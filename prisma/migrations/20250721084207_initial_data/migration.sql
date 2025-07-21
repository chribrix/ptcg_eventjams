INSERT INTO
    "public"."cards" (
        id,
        printed_id,
        name,
        set_code,
        rarity,
        type,
        legal,
        updated_at,
        api_updated_at
    )
VALUES
    (
        'sve-001',
        'SVE-001',
        '{"de": "Pflanzen-Energie", "en": "Basic Grass Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-002',
        'SVE-002',
        '{"de": "Feuer-Energie", "en": "Basic Fire Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-003',
        'SVE-003',
        '{"de": "Wasser-Energie", "en": "Basic Water Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-004',
        'SVE-004',
        '{"de": "Elektro-Energie", "en": "Basic Lightning Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-005',
        'SVE-005',
        '{"de": "Psycho-Energie", "en": "Basic Psychic Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-006',
        'SVE-006',
        '{"de": "Kampf-Energie", "en": "Basic Fighting Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-007',
        'SVE-007',
        '{"de": "Finsternis-Energie", "en": "Basic Darkness Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-008',
        'SVE-008',
        '{"de": "Metall-Energie", "en": "Basic Metal Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-009',
        'SVE-009',
        '{"de": "Pflanzen-Energie", "en": "Basic Grass Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-010',
        'SVE-010',
        '{"de": "Feuer-Energie", "en": "Basic Fire Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-011',
        'SVE-011',
        '{"de": "Wasser-Energie", "en": "Basic Water Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-012',
        'SVE-012',
        '{"de": "Elektro-Energie", "en": "Basic Lightning Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-013',
        'SVE-013',
        '{"de": "Psycho-Energie", "en": "Basic Psychic Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-014',
        'SVE-014',
        '{"de": "Kampf-Energie", "en": "Basic Fighting Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-015',
        'SVE-015',
        '{"de": "Finsternis-Energie", "en": "Basic Darkness Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    ),
    (
        'sve-016',
        'SVE-016',
        '{"de": "Metall-Energie", "en": "Basic Metal Energy"}',
        'sve',
        'Common',
        'ENERGY',
        '{"expanded": true, "standard": true}',
        '2025-07-09',
        '2024-03-31'
    );

INSERT INTO
    conversions.ENERGY_abbrv_map (ptcgl_export, full_text)
VALUES
    ('Basic {L} Energy', 'Basic Lightning Energy'),
    ('Basic {D} Energy', 'Basic Darkness Energy'),
    ('Basic {F} Energy', 'Basic Fighting Energy'),
    ('Basic {P} Energy', 'Basic Psychic Energy'),
    ('Basic {M} Energy', 'Basic Metal Energy'),
    ('Basic {W} Energy', 'Basic Water Energy'),
    ('Basic {G} Energy', 'Basic Grass Energy'),
    ('Basic {R} Energy', 'Basic Fire Energy');

INSERT INTO
    conversions.ENERGY_type_map_en (ENERGY_type, full_text)
VALUES
    ('Lightning', 'Basic Lightning Energy'),
    ('Darkness', 'Basic Darkness Energy'),
    ('Fighting', 'Basic Fighting Energy'),
    ('Psychic', 'Basic Psychic Energy'),
    ('Metal', 'Basic Metal Energy'),
    ('Water', 'Basic Water Energy'),
    ('Grass', 'Basic Grass Energy'),
    ('Fire', 'Basic Fire Energy');

INSERT INTO
    conversions.ENERGY_alias_map (alias, canonical)
VALUES
    ('dark', 'Darkness'),
    ('darkness', 'Darkness'),
    ('electro', 'Lightning'),
    ('electric', 'Lightning'),
    ('lightning', 'Lightning'),
    ('fight', 'Fighting'),
    ('fighting', 'Fighting'),
    ('psychic', 'Psychic'),
    ('psy', 'Psychic'),
    ('metal', 'Metal'),
    ('steel', 'Metal'),
    ('water', 'Water'),
    ('grass', 'Grass'),
    ('leaf', 'Grass'),
    ('fire', 'Fire'),
    ('flame', 'Fire');

INSERT INTO
    conversions.set_codes_en (intl_code, japanese_code, intl_name)
VALUES
    ('svp', 'svp', 'Scarlet & Violet Promos'),
    ('svi', 'sv01', 'Scarlet & Violet Base Set'),
    ('pal', 'sv02', 'Paldea Evolved'),
    ('obf', 'sv03', 'Obsidian Flames'),
    ('mew', 'sv03.5', '151'),
    ('par', 'sv04', 'Paradox Rift'),
    ('paf', 'sv04.5', 'Paldean Fates'),
    ('tef', 'sv05', 'Temporal Forces'),
    ('twm', 'sv06', 'Twilight Masquerade'),
    ('sfa', 'sv06.5', 'Shrouded Fable'),
    ('scr', 'sv07', 'Stellar Crown'),
    ('ssp', 'sv08', 'Surging Sparks'),
    ('pre', 'sv08.5', 'Prismatic Evolutions'),
    ('jtg', 'sv09', 'Journey Together'),
    ('dri', 'sv10', 'Destined Rivals'),
    ('blk', 'sv11b', 'Black Bolt'),
    ('wht', 'sv11w', 'White Flare');