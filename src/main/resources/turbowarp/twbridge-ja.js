(() => {
  const WS_DEFAULT = "ws://127.0.0.1:8787";
  const TWB_BOOT_CONFIG = (() => {
    const fromQuery = () => {
      try {
        const script = typeof document !== 'undefined' ? document.currentScript : null;
        if (!script || !script.src) return null;
        const idx = script.src.indexOf('?');
        if (idx < 0) return null;
        const query = script.src.substring(idx + 1);
        const params = new URLSearchParams(query);
        return {
          host: params.get('host') || '',
          token: params.get('token') || '',
          lang: params.get('lang') || ''
        };
      } catch (e) { return null; }
    };

    const fromHash = () => {
      try {
        const hash = (typeof location !== 'undefined' && location.hash) ? location.hash.replace(/^#/, '') : '';
        const params = new URLSearchParams(hash);
        return {
          host: params.get('host') || '',
          token: params.get('token') || '',
          lang: params.get('lang') || ''
        };
      } catch (e) { return null; }
    };

    return fromQuery() || fromHash() || { host: '', token: '', lang: '' };
  })();
  const TWB_DEFAULT_LANG = "en";
  const TWB_BLOCK_CHOICES = (() => {
    try { return [["Acacia Button","acacia_button"],["Acacia Door","acacia_door"],["Acacia Fence","acacia_fence"],["Acacia Fence Gate","acacia_fence_gate"],["Acacia Hanging Sign","acacia_hanging_sign"],["Acacia Leaves","acacia_leaves"],["Acacia Log","acacia_log"],["Acacia Planks","acacia_planks"],["Acacia Pressure Plate","acacia_pressure_plate"],["Acacia Sapling","acacia_sapling"],["Acacia Shelf","acacia_shelf"],["Acacia Sign","acacia_sign"],["Acacia Slab","acacia_slab"],["Acacia Stairs","acacia_stairs"],["Acacia Trapdoor","acacia_trapdoor"],["Acacia Wood","acacia_wood"],["Activator Rail","activator_rail"],["Allium","allium"],["Amethyst Block","amethyst_block"],["Amethyst Cluster","amethyst_cluster"],["Ancient Debris","ancient_debris"],["Andesite","andesite"],["Andesite Slab","andesite_slab"],["Andesite Stairs","andesite_stairs"],["Andesite Wall","andesite_wall"],["Anvil","anvil"],["Azalea","azalea"],["Azalea Leaves","azalea_leaves"],["Azure Bluet","azure_bluet"],["Bamboo","bamboo"],["Bamboo Block","bamboo_block"],["Bamboo Button","bamboo_button"],["Bamboo Door","bamboo_door"],["Bamboo Fence","bamboo_fence"],["Bamboo Fence Gate","bamboo_fence_gate"],["Bamboo Hanging Sign","bamboo_hanging_sign"],["Bamboo Mosaic","bamboo_mosaic"],["Bamboo Mosaic Slab","bamboo_mosaic_slab"],["Bamboo Mosaic Stairs","bamboo_mosaic_stairs"],["Bamboo Planks","bamboo_planks"],["Bamboo Pressure Plate","bamboo_pressure_plate"],["Bamboo Shelf","bamboo_shelf"],["Bamboo Sign","bamboo_sign"],["Bamboo Slab","bamboo_slab"],["Bamboo Stairs","bamboo_stairs"],["Bamboo Trapdoor","bamboo_trapdoor"],["Barrel","barrel"],["Barrier","barrier"],["Basalt","basalt"],["Beacon","beacon"],["Bedrock","bedrock"],["Bee Nest","bee_nest"],["Beehive","beehive"],["Bell","bell"],["Big Dripleaf","big_dripleaf"],["Birch Button","birch_button"],["Birch Door","birch_door"],["Birch Fence","birch_fence"],["Birch Fence Gate","birch_fence_gate"],["Birch Hanging Sign","birch_hanging_sign"],["Birch Leaves","birch_leaves"],["Birch Log","birch_log"],["Birch Planks","birch_planks"],["Birch Pressure Plate","birch_pressure_plate"],["Birch Sapling","birch_sapling"],["Birch Shelf","birch_shelf"],["Birch Sign","birch_sign"],["Birch Slab","birch_slab"],["Birch Stairs","birch_stairs"],["Birch Trapdoor","birch_trapdoor"],["Birch Wood","birch_wood"],["Black Banner","black_banner"],["Black Bed","black_bed"],["Black Candle","black_candle"],["Black Carpet","black_carpet"],["Black Concrete","black_concrete"],["Black Concrete Powder","black_concrete_powder"],["Black Glazed Terracotta","black_glazed_terracotta"],["Black Shulker Box","black_shulker_box"],["Black Stained Glass","black_stained_glass"],["Black Stained Glass Pane","black_stained_glass_pane"],["Black Terracotta","black_terracotta"],["Black Wool","black_wool"],["Blackstone","blackstone"],["Blackstone Slab","blackstone_slab"],["Blackstone Stairs","blackstone_stairs"],["Blackstone Wall","blackstone_wall"],["Blast Furnace","blast_furnace"],["Blue Banner","blue_banner"],["Blue Bed","blue_bed"],["Blue Candle","blue_candle"],["Blue Carpet","blue_carpet"],["Blue Concrete","blue_concrete"],["Blue Concrete Powder","blue_concrete_powder"],["Blue Glazed Terracotta","blue_glazed_terracotta"],["Blue Ice","blue_ice"],["Blue Orchid","blue_orchid"],["Blue Shulker Box","blue_shulker_box"],["Blue Stained Glass","blue_stained_glass"],["Blue Stained Glass Pane","blue_stained_glass_pane"],["Blue Terracotta","blue_terracotta"],["Blue Wool","blue_wool"],["Bone Block","bone_block"],["Bookshelf","bookshelf"],["Brain Coral","brain_coral"],["Brain Coral Block","brain_coral_block"],["Brain Coral Fan","brain_coral_fan"],["Brewing Stand","brewing_stand"],["Brick Slab","brick_slab"],["Brick Stairs","brick_stairs"],["Brick Wall","brick_wall"],["Bricks","bricks"],["Brown Banner","brown_banner"],["Brown Bed","brown_bed"],["Brown Candle","brown_candle"],["Brown Carpet","brown_carpet"],["Brown Concrete","brown_concrete"],["Brown Concrete Powder","brown_concrete_powder"],["Brown Glazed Terracotta","brown_glazed_terracotta"],["Brown Mushroom","brown_mushroom"],["Brown Mushroom Block","brown_mushroom_block"],["Brown Shulker Box","brown_shulker_box"],["Brown Stained Glass","brown_stained_glass"],["Brown Stained Glass Pane","brown_stained_glass_pane"],["Brown Terracotta","brown_terracotta"],["Brown Wool","brown_wool"],["Bubble Coral","bubble_coral"],["Bubble Coral Block","bubble_coral_block"],["Bubble Coral Fan","bubble_coral_fan"],["Budding Amethyst","budding_amethyst"],["Bush","bush"],["Cactus","cactus"],["Cactus Flower","cactus_flower"],["Cake","cake"],["Calcite","calcite"],["Calibrated Sculk Sensor","calibrated_sculk_sensor"],["Campfire","campfire"],["Candle","candle"],["Cartography Table","cartography_table"],["Carved Pumpkin","carved_pumpkin"],["Cauldron","cauldron"],["Chain Command Block","chain_command_block"],["Cherry Button","cherry_button"],["Cherry Door","cherry_door"],["Cherry Fence","cherry_fence"],["Cherry Fence Gate","cherry_fence_gate"],["Cherry Hanging Sign","cherry_hanging_sign"],["Cherry Leaves","cherry_leaves"],["Cherry Log","cherry_log"],["Cherry Planks","cherry_planks"],["Cherry Pressure Plate","cherry_pressure_plate"],["Cherry Sapling","cherry_sapling"],["Cherry Shelf","cherry_shelf"],["Cherry Sign","cherry_sign"],["Cherry Slab","cherry_slab"],["Cherry Stairs","cherry_stairs"],["Cherry Trapdoor","cherry_trapdoor"],["Cherry Wood","cherry_wood"],["Chest","chest"],["Chipped Anvil","chipped_anvil"],["Chiseled Bookshelf","chiseled_bookshelf"],["Chiseled Copper","chiseled_copper"],["Chiseled Deepslate","chiseled_deepslate"],["Chiseled Nether Bricks","chiseled_nether_bricks"],["Chiseled Polished Blackstone","chiseled_polished_blackstone"],["Chiseled Quartz Block","chiseled_quartz_block"],["Chiseled Red Sandstone","chiseled_red_sandstone"],["Chiseled Resin Bricks","chiseled_resin_bricks"],["Chiseled Sandstone","chiseled_sandstone"],["Chiseled Stone Bricks","chiseled_stone_bricks"],["Chiseled Tuff","chiseled_tuff"],["Chiseled Tuff Bricks","chiseled_tuff_bricks"],["Chorus Flower","chorus_flower"],["Chorus Plant","chorus_plant"],["Clay","clay"],["Closed Eyeblossom","closed_eyeblossom"],["Coal Block","coal_block"],["Coal Ore","coal_ore"],["Coarse Dirt","coarse_dirt"],["Cobbled Deepslate","cobbled_deepslate"],["Cobbled Deepslate Slab","cobbled_deepslate_slab"],["Cobbled Deepslate Stairs","cobbled_deepslate_stairs"],["Cobbled Deepslate Wall","cobbled_deepslate_wall"],["Cobblestone","cobblestone"],["Cobblestone Slab","cobblestone_slab"],["Cobblestone Stairs","cobblestone_stairs"],["Cobblestone Wall","cobblestone_wall"],["Cobweb","cobweb"],["Command Block","command_block"],["Comparator","comparator"],["Composter","composter"],["Conduit","conduit"],["Copper Bars","copper_bars"],["Copper Block","copper_block"],["Copper Bulb","copper_bulb"],["Copper Chain","copper_chain"],["Copper Chest","copper_chest"],["Copper Door","copper_door"],["Copper Golem Statue","copper_golem_statue"],["Copper Grate","copper_grate"],["Copper Lantern","copper_lantern"],["Copper Ore","copper_ore"],["Copper Torch","copper_torch"],["Copper Trapdoor","copper_trapdoor"],["Cornflower","cornflower"],["Cracked Deepslate Bricks","cracked_deepslate_bricks"],["Cracked Deepslate Tiles","cracked_deepslate_tiles"],["Cracked Nether Bricks","cracked_nether_bricks"],["Cracked Polished Blackstone Bricks","cracked_polished_blackstone_bricks"],["Cracked Stone Bricks","cracked_stone_bricks"],["Crafter","crafter"],["Crafting Table","crafting_table"],["Creaking Heart","creaking_heart"],["Creeper Head","creeper_head"],["Crimson Button","crimson_button"],["Crimson Door","crimson_door"],["Crimson Fence","crimson_fence"],["Crimson Fence Gate","crimson_fence_gate"],["Crimson Fungus","crimson_fungus"],["Crimson Hanging Sign","crimson_hanging_sign"],["Crimson Hyphae","crimson_hyphae"],["Crimson Nylium","crimson_nylium"],["Crimson Planks","crimson_planks"],["Crimson Pressure Plate","crimson_pressure_plate"],["Crimson Roots","crimson_roots"],["Crimson Shelf","crimson_shelf"],["Crimson Sign","crimson_sign"],["Crimson Slab","crimson_slab"],["Crimson Stairs","crimson_stairs"],["Crimson Stem","crimson_stem"],["Crimson Trapdoor","crimson_trapdoor"],["Crying Obsidian","crying_obsidian"],["Cut Copper","cut_copper"],["Cut Copper Slab","cut_copper_slab"],["Cut Copper Stairs","cut_copper_stairs"],["Cut Red Sandstone","cut_red_sandstone"],["Cut Red Sandstone Slab","cut_red_sandstone_slab"],["Cut Sandstone","cut_sandstone"],["Cut Sandstone Slab","cut_sandstone_slab"],["Cyan Banner","cyan_banner"],["Cyan Bed","cyan_bed"],["Cyan Candle","cyan_candle"],["Cyan Carpet","cyan_carpet"],["Cyan Concrete","cyan_concrete"],["Cyan Concrete Powder","cyan_concrete_powder"],["Cyan Glazed Terracotta","cyan_glazed_terracotta"],["Cyan Shulker Box","cyan_shulker_box"],["Cyan Stained Glass","cyan_stained_glass"],["Cyan Stained Glass Pane","cyan_stained_glass_pane"],["Cyan Terracotta","cyan_terracotta"],["Cyan Wool","cyan_wool"],["Damaged Anvil","damaged_anvil"],["Dandelion","dandelion"],["Dark Oak Button","dark_oak_button"],["Dark Oak Door","dark_oak_door"],["Dark Oak Fence","dark_oak_fence"],["Dark Oak Fence Gate","dark_oak_fence_gate"],["Dark Oak Hanging Sign","dark_oak_hanging_sign"],["Dark Oak Leaves","dark_oak_leaves"],["Dark Oak Log","dark_oak_log"],["Dark Oak Planks","dark_oak_planks"],["Dark Oak Pressure Plate","dark_oak_pressure_plate"],["Dark Oak Sapling","dark_oak_sapling"],["Dark Oak Shelf","dark_oak_shelf"],["Dark Oak Sign","dark_oak_sign"],["Dark Oak Slab","dark_oak_slab"],["Dark Oak Stairs","dark_oak_stairs"],["Dark Oak Trapdoor","dark_oak_trapdoor"],["Dark Oak Wood","dark_oak_wood"],["Dark Prismarine","dark_prismarine"],["Dark Prismarine Slab","dark_prismarine_slab"],["Dark Prismarine Stairs","dark_prismarine_stairs"],["Daylight Detector","daylight_detector"],["Dead Brain Coral","dead_brain_coral"],["Dead Brain Coral Block","dead_brain_coral_block"],["Dead Brain Coral Fan","dead_brain_coral_fan"],["Dead Bubble Coral","dead_bubble_coral"],["Dead Bubble Coral Block","dead_bubble_coral_block"],["Dead Bubble Coral Fan","dead_bubble_coral_fan"],["Dead Bush","dead_bush"],["Dead Fire Coral","dead_fire_coral"],["Dead Fire Coral Block","dead_fire_coral_block"],["Dead Fire Coral Fan","dead_fire_coral_fan"],["Dead Horn Coral","dead_horn_coral"],["Dead Horn Coral Block","dead_horn_coral_block"],["Dead Horn Coral Fan","dead_horn_coral_fan"],["Dead Tube Coral","dead_tube_coral"],["Dead Tube Coral Block","dead_tube_coral_block"],["Dead Tube Coral Fan","dead_tube_coral_fan"],["Decorated Pot","decorated_pot"],["Deepslate","deepslate"],["Deepslate Brick Slab","deepslate_brick_slab"],["Deepslate Brick Stairs","deepslate_brick_stairs"],["Deepslate Brick Wall","deepslate_brick_wall"],["Deepslate Bricks","deepslate_bricks"],["Deepslate Coal Ore","deepslate_coal_ore"],["Deepslate Copper Ore","deepslate_copper_ore"],["Deepslate Diamond Ore","deepslate_diamond_ore"],["Deepslate Emerald Ore","deepslate_emerald_ore"],["Deepslate Gold Ore","deepslate_gold_ore"],["Deepslate Iron Ore","deepslate_iron_ore"],["Deepslate Lapis Ore","deepslate_lapis_ore"],["Deepslate Redstone Ore","deepslate_redstone_ore"],["Deepslate Tile Slab","deepslate_tile_slab"],["Deepslate Tile Stairs","deepslate_tile_stairs"],["Deepslate Tile Wall","deepslate_tile_wall"],["Deepslate Tiles","deepslate_tiles"],["Detector Rail","detector_rail"],["Diamond Block","diamond_block"],["Diamond Ore","diamond_ore"],["Diorite","diorite"],["Diorite Slab","diorite_slab"],["Diorite Stairs","diorite_stairs"],["Diorite Wall","diorite_wall"],["Dirt","dirt"],["Dirt Path","dirt_path"],["Dispenser","dispenser"],["Dragon Egg","dragon_egg"],["Dragon Head","dragon_head"],["Dried Ghast","dried_ghast"],["Dried Kelp Block","dried_kelp_block"],["Dripstone Block","dripstone_block"],["Dropper","dropper"],["Emerald Block","emerald_block"],["Emerald Ore","emerald_ore"],["Enchanting Table","enchanting_table"],["End Portal Frame","end_portal_frame"],["End Rod","end_rod"],["End Stone","end_stone"],["End Stone Brick Slab","end_stone_brick_slab"],["End Stone Brick Stairs","end_stone_brick_stairs"],["End Stone Brick Wall","end_stone_brick_wall"],["End Stone Bricks","end_stone_bricks"],["Ender Chest","ender_chest"],["Exposed Chiseled Copper","exposed_chiseled_copper"],["Exposed Copper","exposed_copper"],["Exposed Copper Bars","exposed_copper_bars"],["Exposed Copper Bulb","exposed_copper_bulb"],["Exposed Copper Chain","exposed_copper_chain"],["Exposed Copper Chest","exposed_copper_chest"],["Exposed Copper Door","exposed_copper_door"],["Exposed Copper Golem Statue","exposed_copper_golem_statue"],["Exposed Copper Grate","exposed_copper_grate"],["Exposed Copper Lantern","exposed_copper_lantern"],["Exposed Copper Trapdoor","exposed_copper_trapdoor"],["Exposed Cut Copper","exposed_cut_copper"],["Exposed Cut Copper Slab","exposed_cut_copper_slab"],["Exposed Cut Copper Stairs","exposed_cut_copper_stairs"],["Exposed Lightning Rod","exposed_lightning_rod"],["Farmland","farmland"],["Fern","fern"],["Fire Coral","fire_coral"],["Fire Coral Block","fire_coral_block"],["Fire Coral Fan","fire_coral_fan"],["Firefly Bush","firefly_bush"],["Fletching Table","fletching_table"],["Flower Pot","flower_pot"],["Flowering Azalea","flowering_azalea"],["Flowering Azalea Leaves","flowering_azalea_leaves"],["Frogspawn","frogspawn"],["Furnace","furnace"],["Gilded Blackstone","gilded_blackstone"],["Glass","glass"],["Glass Pane","glass_pane"],["Glow Lichen","glow_lichen"],["Glowstone","glowstone"],["Gold Block","gold_block"],["Gold Ore","gold_ore"],["Granite","granite"],["Granite Slab","granite_slab"],["Granite Stairs","granite_stairs"],["Granite Wall","granite_wall"],["Grass Block","grass_block"],["Gravel","gravel"],["Gray Banner","gray_banner"],["Gray Bed","gray_bed"],["Gray Candle","gray_candle"],["Gray Carpet","gray_carpet"],["Gray Concrete","gray_concrete"],["Gray Concrete Powder","gray_concrete_powder"],["Gray Glazed Terracotta","gray_glazed_terracotta"],["Gray Shulker Box","gray_shulker_box"],["Gray Stained Glass","gray_stained_glass"],["Gray Stained Glass Pane","gray_stained_glass_pane"],["Gray Terracotta","gray_terracotta"],["Gray Wool","gray_wool"],["Green Banner","green_banner"],["Green Bed","green_bed"],["Green Candle","green_candle"],["Green Carpet","green_carpet"],["Green Concrete","green_concrete"],["Green Concrete Powder","green_concrete_powder"],["Green Glazed Terracotta","green_glazed_terracotta"],["Green Shulker Box","green_shulker_box"],["Green Stained Glass","green_stained_glass"],["Green Stained Glass Pane","green_stained_glass_pane"],["Green Terracotta","green_terracotta"],["Green Wool","green_wool"],["Grindstone","grindstone"],["Hanging Roots","hanging_roots"],["Hay Block","hay_block"],["Heavy Core","heavy_core"],["Heavy Weighted Pressure Plate","heavy_weighted_pressure_plate"],["Honey Block","honey_block"],["Honeycomb Block","honeycomb_block"],["Hopper","hopper"],["Horn Coral","horn_coral"],["Horn Coral Block","horn_coral_block"],["Horn Coral Fan","horn_coral_fan"],["Ice","ice"],["Infested Chiseled Stone Bricks","infested_chiseled_stone_bricks"],["Infested Cobblestone","infested_cobblestone"],["Infested Cracked Stone Bricks","infested_cracked_stone_bricks"],["Infested Deepslate","infested_deepslate"],["Infested Mossy Stone Bricks","infested_mossy_stone_bricks"],["Infested Stone","infested_stone"],["Infested Stone Bricks","infested_stone_bricks"],["Iron Bars","iron_bars"],["Iron Block","iron_block"],["Iron Chain","iron_chain"],["Iron Door","iron_door"],["Iron Ore","iron_ore"],["Iron Trapdoor","iron_trapdoor"],["Jack O Lantern","jack_o_lantern"],["Jigsaw","jigsaw"],["Jukebox","jukebox"],["Jungle Button","jungle_button"],["Jungle Door","jungle_door"],["Jungle Fence","jungle_fence"],["Jungle Fence Gate","jungle_fence_gate"],["Jungle Hanging Sign","jungle_hanging_sign"],["Jungle Leaves","jungle_leaves"],["Jungle Log","jungle_log"],["Jungle Planks","jungle_planks"],["Jungle Pressure Plate","jungle_pressure_plate"],["Jungle Sapling","jungle_sapling"],["Jungle Shelf","jungle_shelf"],["Jungle Sign","jungle_sign"],["Jungle Slab","jungle_slab"],["Jungle Stairs","jungle_stairs"],["Jungle Trapdoor","jungle_trapdoor"],["Jungle Wood","jungle_wood"],["Kelp","kelp"],["Ladder","ladder"],["Lantern","lantern"],["Lapis Block","lapis_block"],["Lapis Ore","lapis_ore"],["Large Amethyst Bud","large_amethyst_bud"],["Large Fern","large_fern"],["Leaf Litter","leaf_litter"],["Lectern","lectern"],["Lever","lever"],["Light","light"],["Light Blue Banner","light_blue_banner"],["Light Blue Bed","light_blue_bed"],["Light Blue Candle","light_blue_candle"],["Light Blue Carpet","light_blue_carpet"],["Light Blue Concrete","light_blue_concrete"],["Light Blue Concrete Powder","light_blue_concrete_powder"],["Light Blue Glazed Terracotta","light_blue_glazed_terracotta"],["Light Blue Shulker Box","light_blue_shulker_box"],["Light Blue Stained Glass","light_blue_stained_glass"],["Light Blue Stained Glass Pane","light_blue_stained_glass_pane"],["Light Blue Terracotta","light_blue_terracotta"],["Light Blue Wool","light_blue_wool"],["Light Gray Banner","light_gray_banner"],["Light Gray Bed","light_gray_bed"],["Light Gray Candle","light_gray_candle"],["Light Gray Carpet","light_gray_carpet"],["Light Gray Concrete","light_gray_concrete"],["Light Gray Concrete Powder","light_gray_concrete_powder"],["Light Gray Glazed Terracotta","light_gray_glazed_terracotta"],["Light Gray Shulker Box","light_gray_shulker_box"],["Light Gray Stained Glass","light_gray_stained_glass"],["Light Gray Stained Glass Pane","light_gray_stained_glass_pane"],["Light Gray Terracotta","light_gray_terracotta"],["Light Gray Wool","light_gray_wool"],["Light Weighted Pressure Plate","light_weighted_pressure_plate"],["Lightning Rod","lightning_rod"],["Lilac","lilac"],["Lily Of The Valley","lily_of_the_valley"],["Lily Pad","lily_pad"],["Lime Banner","lime_banner"],["Lime Bed","lime_bed"],["Lime Candle","lime_candle"],["Lime Carpet","lime_carpet"],["Lime Concrete","lime_concrete"],["Lime Concrete Powder","lime_concrete_powder"],["Lime Glazed Terracotta","lime_glazed_terracotta"],["Lime Shulker Box","lime_shulker_box"],["Lime Stained Glass","lime_stained_glass"],["Lime Stained Glass Pane","lime_stained_glass_pane"],["Lime Terracotta","lime_terracotta"],["Lime Wool","lime_wool"],["Lodestone","lodestone"],["Loom","loom"],["Magenta Banner","magenta_banner"],["Magenta Bed","magenta_bed"],["Magenta Candle","magenta_candle"],["Magenta Carpet","magenta_carpet"],["Magenta Concrete","magenta_concrete"],["Magenta Concrete Powder","magenta_concrete_powder"],["Magenta Glazed Terracotta","magenta_glazed_terracotta"],["Magenta Shulker Box","magenta_shulker_box"],["Magenta Stained Glass","magenta_stained_glass"],["Magenta Stained Glass Pane","magenta_stained_glass_pane"],["Magenta Terracotta","magenta_terracotta"],["Magenta Wool","magenta_wool"],["Magma Block","magma_block"],["Mangrove Button","mangrove_button"],["Mangrove Door","mangrove_door"],["Mangrove Fence","mangrove_fence"],["Mangrove Fence Gate","mangrove_fence_gate"],["Mangrove Hanging Sign","mangrove_hanging_sign"],["Mangrove Leaves","mangrove_leaves"],["Mangrove Log","mangrove_log"],["Mangrove Planks","mangrove_planks"],["Mangrove Pressure Plate","mangrove_pressure_plate"],["Mangrove Propagule","mangrove_propagule"],["Mangrove Roots","mangrove_roots"],["Mangrove Shelf","mangrove_shelf"],["Mangrove Sign","mangrove_sign"],["Mangrove Slab","mangrove_slab"],["Mangrove Stairs","mangrove_stairs"],["Mangrove Trapdoor","mangrove_trapdoor"],["Mangrove Wood","mangrove_wood"],["Medium Amethyst Bud","medium_amethyst_bud"],["Melon","melon"],["Moss Block","moss_block"],["Moss Carpet","moss_carpet"],["Mossy Cobblestone","mossy_cobblestone"],["Mossy Cobblestone Slab","mossy_cobblestone_slab"],["Mossy Cobblestone Stairs","mossy_cobblestone_stairs"],["Mossy Cobblestone Wall","mossy_cobblestone_wall"],["Mossy Stone Brick Slab","mossy_stone_brick_slab"],["Mossy Stone Brick Stairs","mossy_stone_brick_stairs"],["Mossy Stone Brick Wall","mossy_stone_brick_wall"],["Mossy Stone Bricks","mossy_stone_bricks"],["Mud","mud"],["Mud Brick Slab","mud_brick_slab"],["Mud Brick Stairs","mud_brick_stairs"],["Mud Brick Wall","mud_brick_wall"],["Mud Bricks","mud_bricks"],["Muddy Mangrove Roots","muddy_mangrove_roots"],["Mushroom Stem","mushroom_stem"],["Mycelium","mycelium"],["Nether Brick Fence","nether_brick_fence"],["Nether Brick Slab","nether_brick_slab"],["Nether Brick Stairs","nether_brick_stairs"],["Nether Brick Wall","nether_brick_wall"],["Nether Bricks","nether_bricks"],["Nether Gold Ore","nether_gold_ore"],["Nether Quartz Ore","nether_quartz_ore"],["Nether Sprouts","nether_sprouts"],["Nether Wart","nether_wart"],["Nether Wart Block","nether_wart_block"],["Netherite Block","netherite_block"],["Netherrack","netherrack"],["Note Block","note_block"],["Oak Button","oak_button"],["Oak Door","oak_door"],["Oak Fence","oak_fence"],["Oak Fence Gate","oak_fence_gate"],["Oak Hanging Sign","oak_hanging_sign"],["Oak Leaves","oak_leaves"],["Oak Log","oak_log"],["Oak Planks","oak_planks"],["Oak Pressure Plate","oak_pressure_plate"],["Oak Sapling","oak_sapling"],["Oak Shelf","oak_shelf"],["Oak Sign","oak_sign"],["Oak Slab","oak_slab"],["Oak Stairs","oak_stairs"],["Oak Trapdoor","oak_trapdoor"],["Oak Wood","oak_wood"],["Observer","observer"],["Obsidian","obsidian"],["Ochre Froglight","ochre_froglight"],["Open Eyeblossom","open_eyeblossom"],["Orange Banner","orange_banner"],["Orange Bed","orange_bed"],["Orange Candle","orange_candle"],["Orange Carpet","orange_carpet"],["Orange Concrete","orange_concrete"],["Orange Concrete Powder","orange_concrete_powder"],["Orange Glazed Terracotta","orange_glazed_terracotta"],["Orange Shulker Box","orange_shulker_box"],["Orange Stained Glass","orange_stained_glass"],["Orange Stained Glass Pane","orange_stained_glass_pane"],["Orange Terracotta","orange_terracotta"],["Orange Tulip","orange_tulip"],["Orange Wool","orange_wool"],["Oxeye Daisy","oxeye_daisy"],["Oxidized Chiseled Copper","oxidized_chiseled_copper"],["Oxidized Copper","oxidized_copper"],["Oxidized Copper Bars","oxidized_copper_bars"],["Oxidized Copper Bulb","oxidized_copper_bulb"],["Oxidized Copper Chain","oxidized_copper_chain"],["Oxidized Copper Chest","oxidized_copper_chest"],["Oxidized Copper Door","oxidized_copper_door"],["Oxidized Copper Golem Statue","oxidized_copper_golem_statue"],["Oxidized Copper Grate","oxidized_copper_grate"],["Oxidized Copper Lantern","oxidized_copper_lantern"],["Oxidized Copper Trapdoor","oxidized_copper_trapdoor"],["Oxidized Cut Copper","oxidized_cut_copper"],["Oxidized Cut Copper Slab","oxidized_cut_copper_slab"],["Oxidized Cut Copper Stairs","oxidized_cut_copper_stairs"],["Oxidized Lightning Rod","oxidized_lightning_rod"],["Packed Ice","packed_ice"],["Packed Mud","packed_mud"],["Pale Hanging Moss","pale_hanging_moss"],["Pale Moss Block","pale_moss_block"],["Pale Moss Carpet","pale_moss_carpet"],["Pale Oak Button","pale_oak_button"],["Pale Oak Door","pale_oak_door"],["Pale Oak Fence","pale_oak_fence"],["Pale Oak Fence Gate","pale_oak_fence_gate"],["Pale Oak Hanging Sign","pale_oak_hanging_sign"],["Pale Oak Leaves","pale_oak_leaves"],["Pale Oak Log","pale_oak_log"],["Pale Oak Planks","pale_oak_planks"],["Pale Oak Pressure Plate","pale_oak_pressure_plate"],["Pale Oak Sapling","pale_oak_sapling"],["Pale Oak Shelf","pale_oak_shelf"],["Pale Oak Sign","pale_oak_sign"],["Pale Oak Slab","pale_oak_slab"],["Pale Oak Stairs","pale_oak_stairs"],["Pale Oak Trapdoor","pale_oak_trapdoor"],["Pale Oak Wood","pale_oak_wood"],["Pearlescent Froglight","pearlescent_froglight"],["Peony","peony"],["Petrified Oak Slab","petrified_oak_slab"],["Piglin Head","piglin_head"],["Pink Banner","pink_banner"],["Pink Bed","pink_bed"],["Pink Candle","pink_candle"],["Pink Carpet","pink_carpet"],["Pink Concrete","pink_concrete"],["Pink Concrete Powder","pink_concrete_powder"],["Pink Glazed Terracotta","pink_glazed_terracotta"],["Pink Petals","pink_petals"],["Pink Shulker Box","pink_shulker_box"],["Pink Stained Glass","pink_stained_glass"],["Pink Stained Glass Pane","pink_stained_glass_pane"],["Pink Terracotta","pink_terracotta"],["Pink Tulip","pink_tulip"],["Pink Wool","pink_wool"],["Piston","piston"],["Pitcher Plant","pitcher_plant"],["Player Head","player_head"],["Podzol","podzol"],["Pointed Dripstone","pointed_dripstone"],["Polished Andesite","polished_andesite"],["Polished Andesite Slab","polished_andesite_slab"],["Polished Andesite Stairs","polished_andesite_stairs"],["Polished Basalt","polished_basalt"],["Polished Blackstone","polished_blackstone"],["Polished Blackstone Brick Slab","polished_blackstone_brick_slab"],["Polished Blackstone Brick Stairs","polished_blackstone_brick_stairs"],["Polished Blackstone Brick Wall","polished_blackstone_brick_wall"],["Polished Blackstone Bricks","polished_blackstone_bricks"],["Polished Blackstone Button","polished_blackstone_button"],["Polished Blackstone Pressure Plate","polished_blackstone_pressure_plate"],["Polished Blackstone Slab","polished_blackstone_slab"],["Polished Blackstone Stairs","polished_blackstone_stairs"],["Polished Blackstone Wall","polished_blackstone_wall"],["Polished Deepslate","polished_deepslate"],["Polished Deepslate Slab","polished_deepslate_slab"],["Polished Deepslate Stairs","polished_deepslate_stairs"],["Polished Deepslate Wall","polished_deepslate_wall"],["Polished Diorite","polished_diorite"],["Polished Diorite Slab","polished_diorite_slab"],["Polished Diorite Stairs","polished_diorite_stairs"],["Polished Granite","polished_granite"],["Polished Granite Slab","polished_granite_slab"],["Polished Granite Stairs","polished_granite_stairs"],["Polished Tuff","polished_tuff"],["Polished Tuff Slab","polished_tuff_slab"],["Polished Tuff Stairs","polished_tuff_stairs"],["Polished Tuff Wall","polished_tuff_wall"],["Poppy","poppy"],["Powered Rail","powered_rail"],["Prismarine","prismarine"],["Prismarine Brick Slab","prismarine_brick_slab"],["Prismarine Brick Stairs","prismarine_brick_stairs"],["Prismarine Bricks","prismarine_bricks"],["Prismarine Slab","prismarine_slab"],["Prismarine Stairs","prismarine_stairs"],["Prismarine Wall","prismarine_wall"],["Pumpkin","pumpkin"],["Purple Banner","purple_banner"],["Purple Bed","purple_bed"],["Purple Candle","purple_candle"],["Purple Carpet","purple_carpet"],["Purple Concrete","purple_concrete"],["Purple Concrete Powder","purple_concrete_powder"],["Purple Glazed Terracotta","purple_glazed_terracotta"],["Purple Shulker Box","purple_shulker_box"],["Purple Stained Glass","purple_stained_glass"],["Purple Stained Glass Pane","purple_stained_glass_pane"],["Purple Terracotta","purple_terracotta"],["Purple Wool","purple_wool"],["Purpur Block","purpur_block"],["Purpur Pillar","purpur_pillar"],["Purpur Slab","purpur_slab"],["Purpur Stairs","purpur_stairs"],["Quartz Block","quartz_block"],["Quartz Bricks","quartz_bricks"],["Quartz Pillar","quartz_pillar"],["Quartz Slab","quartz_slab"],["Quartz Stairs","quartz_stairs"],["Rail","rail"],["Raw Copper Block","raw_copper_block"],["Raw Gold Block","raw_gold_block"],["Raw Iron Block","raw_iron_block"],["Red Banner","red_banner"],["Red Bed","red_bed"],["Red Candle","red_candle"],["Red Carpet","red_carpet"],["Red Concrete","red_concrete"],["Red Concrete Powder","red_concrete_powder"],["Red Glazed Terracotta","red_glazed_terracotta"],["Red Mushroom","red_mushroom"],["Red Mushroom Block","red_mushroom_block"],["Red Nether Brick Slab","red_nether_brick_slab"],["Red Nether Brick Stairs","red_nether_brick_stairs"],["Red Nether Brick Wall","red_nether_brick_wall"],["Red Nether Bricks","red_nether_bricks"],["Red Sand","red_sand"],["Red Sandstone","red_sandstone"],["Red Sandstone Slab","red_sandstone_slab"],["Red Sandstone Stairs","red_sandstone_stairs"],["Red Sandstone Wall","red_sandstone_wall"],["Red Shulker Box","red_shulker_box"],["Red Stained Glass","red_stained_glass"],["Red Stained Glass Pane","red_stained_glass_pane"],["Red Terracotta","red_terracotta"],["Red Tulip","red_tulip"],["Red Wool","red_wool"],["Redstone Block","redstone_block"],["Redstone Lamp","redstone_lamp"],["Redstone Ore","redstone_ore"],["Redstone Torch","redstone_torch"],["Reinforced Deepslate","reinforced_deepslate"],["Repeater","repeater"],["Repeating Command Block","repeating_command_block"],["Resin Block","resin_block"],["Resin Brick Slab","resin_brick_slab"],["Resin Brick Stairs","resin_brick_stairs"],["Resin Brick Wall","resin_brick_wall"],["Resin Bricks","resin_bricks"],["Resin Clump","resin_clump"],["Respawn Anchor","respawn_anchor"],["Rooted Dirt","rooted_dirt"],["Rose Bush","rose_bush"],["Sand","sand"],["Sandstone","sandstone"],["Sandstone Slab","sandstone_slab"],["Sandstone Stairs","sandstone_stairs"],["Sandstone Wall","sandstone_wall"],["Scaffolding","scaffolding"],["Sculk","sculk"],["Sculk Catalyst","sculk_catalyst"],["Sculk Sensor","sculk_sensor"],["Sculk Shrieker","sculk_shrieker"],["Sculk Vein","sculk_vein"],["Sea Lantern","sea_lantern"],["Sea Pickle","sea_pickle"],["Seagrass","seagrass"],["Short Dry Grass","short_dry_grass"],["Short Grass","short_grass"],["Shroomlight","shroomlight"],["Shulker Box","shulker_box"],["Skeleton Skull","skeleton_skull"],["Slime Block","slime_block"],["Small Amethyst Bud","small_amethyst_bud"],["Small Dripleaf","small_dripleaf"],["Smithing Table","smithing_table"],["Smoker","smoker"],["Smooth Basalt","smooth_basalt"],["Smooth Quartz","smooth_quartz"],["Smooth Quartz Slab","smooth_quartz_slab"],["Smooth Quartz Stairs","smooth_quartz_stairs"],["Smooth Red Sandstone","smooth_red_sandstone"],["Smooth Red Sandstone Slab","smooth_red_sandstone_slab"],["Smooth Red Sandstone Stairs","smooth_red_sandstone_stairs"],["Smooth Sandstone","smooth_sandstone"],["Smooth Sandstone Slab","smooth_sandstone_slab"],["Smooth Sandstone Stairs","smooth_sandstone_stairs"],["Smooth Stone","smooth_stone"],["Smooth Stone Slab","smooth_stone_slab"],["Sniffer Egg","sniffer_egg"],["Snow","snow"],["Snow Block","snow_block"],["Soul Campfire","soul_campfire"],["Soul Lantern","soul_lantern"],["Soul Sand","soul_sand"],["Soul Soil","soul_soil"],["Soul Torch","soul_torch"],["Spawner","spawner"],["Sponge","sponge"],["Spore Blossom","spore_blossom"],["Spruce Button","spruce_button"],["Spruce Door","spruce_door"],["Spruce Fence","spruce_fence"],["Spruce Fence Gate","spruce_fence_gate"],["Spruce Hanging Sign","spruce_hanging_sign"],["Spruce Leaves","spruce_leaves"],["Spruce Log","spruce_log"],["Spruce Planks","spruce_planks"],["Spruce Pressure Plate","spruce_pressure_plate"],["Spruce Sapling","spruce_sapling"],["Spruce Shelf","spruce_shelf"],["Spruce Sign","spruce_sign"],["Spruce Slab","spruce_slab"],["Spruce Stairs","spruce_stairs"],["Spruce Trapdoor","spruce_trapdoor"],["Spruce Wood","spruce_wood"],["Sticky Piston","sticky_piston"],["Stone","stone"],["Stone Brick Slab","stone_brick_slab"],["Stone Brick Stairs","stone_brick_stairs"],["Stone Brick Wall","stone_brick_wall"],["Stone Bricks","stone_bricks"],["Stone Button","stone_button"],["Stone Pressure Plate","stone_pressure_plate"],["Stone Slab","stone_slab"],["Stone Stairs","stone_stairs"],["Stonecutter","stonecutter"],["Stripped Acacia Log","stripped_acacia_log"],["Stripped Acacia Wood","stripped_acacia_wood"],["Stripped Bamboo Block","stripped_bamboo_block"],["Stripped Birch Log","stripped_birch_log"],["Stripped Birch Wood","stripped_birch_wood"],["Stripped Cherry Log","stripped_cherry_log"],["Stripped Cherry Wood","stripped_cherry_wood"],["Stripped Crimson Hyphae","stripped_crimson_hyphae"],["Stripped Crimson Stem","stripped_crimson_stem"],["Stripped Dark Oak Log","stripped_dark_oak_log"],["Stripped Dark Oak Wood","stripped_dark_oak_wood"],["Stripped Jungle Log","stripped_jungle_log"],["Stripped Jungle Wood","stripped_jungle_wood"],["Stripped Mangrove Log","stripped_mangrove_log"],["Stripped Mangrove Wood","stripped_mangrove_wood"],["Stripped Oak Log","stripped_oak_log"],["Stripped Oak Wood","stripped_oak_wood"],["Stripped Pale Oak Log","stripped_pale_oak_log"],["Stripped Pale Oak Wood","stripped_pale_oak_wood"],["Stripped Spruce Log","stripped_spruce_log"],["Stripped Spruce Wood","stripped_spruce_wood"],["Stripped Warped Hyphae","stripped_warped_hyphae"],["Stripped Warped Stem","stripped_warped_stem"],["Structure Block","structure_block"],["Structure Void","structure_void"],["Sugar Cane","sugar_cane"],["Sunflower","sunflower"],["Suspicious Gravel","suspicious_gravel"],["Suspicious Sand","suspicious_sand"],["Tall Dry Grass","tall_dry_grass"],["Tall Grass","tall_grass"],["Target","target"],["Terracotta","terracotta"],["Test Block","test_block"],["Test Instance Block","test_instance_block"],["Tinted Glass","tinted_glass"],["Tnt","tnt"],["Torch","torch"],["Torchflower","torchflower"],["Trapped Chest","trapped_chest"],["Trial Spawner","trial_spawner"],["Tripwire Hook","tripwire_hook"],["Tube Coral","tube_coral"],["Tube Coral Block","tube_coral_block"],["Tube Coral Fan","tube_coral_fan"],["Tuff","tuff"],["Tuff Brick Slab","tuff_brick_slab"],["Tuff Brick Stairs","tuff_brick_stairs"],["Tuff Brick Wall","tuff_brick_wall"],["Tuff Bricks","tuff_bricks"],["Tuff Slab","tuff_slab"],["Tuff Stairs","tuff_stairs"],["Tuff Wall","tuff_wall"],["Turtle Egg","turtle_egg"],["Twisting Vines","twisting_vines"],["Vault","vault"],["Verdant Froglight","verdant_froglight"],["Vine","vine"],["Warped Button","warped_button"],["Warped Door","warped_door"],["Warped Fence","warped_fence"],["Warped Fence Gate","warped_fence_gate"],["Warped Fungus","warped_fungus"],["Warped Hanging Sign","warped_hanging_sign"],["Warped Hyphae","warped_hyphae"],["Warped Nylium","warped_nylium"],["Warped Planks","warped_planks"],["Warped Pressure Plate","warped_pressure_plate"],["Warped Roots","warped_roots"],["Warped Shelf","warped_shelf"],["Warped Sign","warped_sign"],["Warped Slab","warped_slab"],["Warped Stairs","warped_stairs"],["Warped Stem","warped_stem"],["Warped Trapdoor","warped_trapdoor"],["Warped Wart Block","warped_wart_block"],["Waxed Chiseled Copper","waxed_chiseled_copper"],["Waxed Copper Bars","waxed_copper_bars"],["Waxed Copper Block","waxed_copper_block"],["Waxed Copper Bulb","waxed_copper_bulb"],["Waxed Copper Chain","waxed_copper_chain"],["Waxed Copper Chest","waxed_copper_chest"],["Waxed Copper Door","waxed_copper_door"],["Waxed Copper Golem Statue","waxed_copper_golem_statue"],["Waxed Copper Grate","waxed_copper_grate"],["Waxed Copper Lantern","waxed_copper_lantern"],["Waxed Copper Trapdoor","waxed_copper_trapdoor"],["Waxed Cut Copper","waxed_cut_copper"],["Waxed Cut Copper Slab","waxed_cut_copper_slab"],["Waxed Cut Copper Stairs","waxed_cut_copper_stairs"],["Waxed Exposed Chiseled Copper","waxed_exposed_chiseled_copper"],["Waxed Exposed Copper","waxed_exposed_copper"],["Waxed Exposed Copper Bars","waxed_exposed_copper_bars"],["Waxed Exposed Copper Bulb","waxed_exposed_copper_bulb"],["Waxed Exposed Copper Chain","waxed_exposed_copper_chain"],["Waxed Exposed Copper Chest","waxed_exposed_copper_chest"],["Waxed Exposed Copper Door","waxed_exposed_copper_door"],["Waxed Exposed Copper Golem Statue","waxed_exposed_copper_golem_statue"],["Waxed Exposed Copper Grate","waxed_exposed_copper_grate"],["Waxed Exposed Copper Lantern","waxed_exposed_copper_lantern"],["Waxed Exposed Copper Trapdoor","waxed_exposed_copper_trapdoor"],["Waxed Exposed Cut Copper","waxed_exposed_cut_copper"],["Waxed Exposed Cut Copper Slab","waxed_exposed_cut_copper_slab"],["Waxed Exposed Cut Copper Stairs","waxed_exposed_cut_copper_stairs"],["Waxed Exposed Lightning Rod","waxed_exposed_lightning_rod"],["Waxed Lightning Rod","waxed_lightning_rod"],["Waxed Oxidized Chiseled Copper","waxed_oxidized_chiseled_copper"],["Waxed Oxidized Copper","waxed_oxidized_copper"],["Waxed Oxidized Copper Bars","waxed_oxidized_copper_bars"],["Waxed Oxidized Copper Bulb","waxed_oxidized_copper_bulb"],["Waxed Oxidized Copper Chain","waxed_oxidized_copper_chain"],["Waxed Oxidized Copper Chest","waxed_oxidized_copper_chest"],["Waxed Oxidized Copper Door","waxed_oxidized_copper_door"],["Waxed Oxidized Copper Golem Statue","waxed_oxidized_copper_golem_statue"],["Waxed Oxidized Copper Grate","waxed_oxidized_copper_grate"],["Waxed Oxidized Copper Lantern","waxed_oxidized_copper_lantern"],["Waxed Oxidized Copper Trapdoor","waxed_oxidized_copper_trapdoor"],["Waxed Oxidized Cut Copper","waxed_oxidized_cut_copper"],["Waxed Oxidized Cut Copper Slab","waxed_oxidized_cut_copper_slab"],["Waxed Oxidized Cut Copper Stairs","waxed_oxidized_cut_copper_stairs"],["Waxed Oxidized Lightning Rod","waxed_oxidized_lightning_rod"],["Waxed Weathered Chiseled Copper","waxed_weathered_chiseled_copper"],["Waxed Weathered Copper","waxed_weathered_copper"],["Waxed Weathered Copper Bars","waxed_weathered_copper_bars"],["Waxed Weathered Copper Bulb","waxed_weathered_copper_bulb"],["Waxed Weathered Copper Chain","waxed_weathered_copper_chain"],["Waxed Weathered Copper Chest","waxed_weathered_copper_chest"],["Waxed Weathered Copper Door","waxed_weathered_copper_door"],["Waxed Weathered Copper Golem Statue","waxed_weathered_copper_golem_statue"],["Waxed Weathered Copper Grate","waxed_weathered_copper_grate"],["Waxed Weathered Copper Lantern","waxed_weathered_copper_lantern"],["Waxed Weathered Copper Trapdoor","waxed_weathered_copper_trapdoor"],["Waxed Weathered Cut Copper","waxed_weathered_cut_copper"],["Waxed Weathered Cut Copper Slab","waxed_weathered_cut_copper_slab"],["Waxed Weathered Cut Copper Stairs","waxed_weathered_cut_copper_stairs"],["Waxed Weathered Lightning Rod","waxed_weathered_lightning_rod"],["Weathered Chiseled Copper","weathered_chiseled_copper"],["Weathered Copper","weathered_copper"],["Weathered Copper Bars","weathered_copper_bars"],["Weathered Copper Bulb","weathered_copper_bulb"],["Weathered Copper Chain","weathered_copper_chain"],["Weathered Copper Chest","weathered_copper_chest"],["Weathered Copper Door","weathered_copper_door"],["Weathered Copper Golem Statue","weathered_copper_golem_statue"],["Weathered Copper Grate","weathered_copper_grate"],["Weathered Copper Lantern","weathered_copper_lantern"],["Weathered Copper Trapdoor","weathered_copper_trapdoor"],["Weathered Cut Copper","weathered_cut_copper"],["Weathered Cut Copper Slab","weathered_cut_copper_slab"],["Weathered Cut Copper Stairs","weathered_cut_copper_stairs"],["Weathered Lightning Rod","weathered_lightning_rod"],["Weeping Vines","weeping_vines"],["Wet Sponge","wet_sponge"],["Wheat","wheat"],["White Banner","white_banner"],["White Bed","white_bed"],["White Candle","white_candle"],["White Carpet","white_carpet"],["White Concrete","white_concrete"],["White Concrete Powder","white_concrete_powder"],["White Glazed Terracotta","white_glazed_terracotta"],["White Shulker Box","white_shulker_box"],["White Stained Glass","white_stained_glass"],["White Stained Glass Pane","white_stained_glass_pane"],["White Terracotta","white_terracotta"],["White Tulip","white_tulip"],["White Wool","white_wool"],["Wildflowers","wildflowers"],["Wither Rose","wither_rose"],["Wither Skeleton Skull","wither_skeleton_skull"],["Yellow Banner","yellow_banner"],["Yellow Bed","yellow_bed"],["Yellow Candle","yellow_candle"],["Yellow Carpet","yellow_carpet"],["Yellow Concrete","yellow_concrete"],["Yellow Concrete Powder","yellow_concrete_powder"],["Yellow Glazed Terracotta","yellow_glazed_terracotta"],["Yellow Shulker Box","yellow_shulker_box"],["Yellow Stained Glass","yellow_stained_glass"],["Yellow Stained Glass Pane","yellow_stained_glass_pane"],["Yellow Terracotta","yellow_terracotta"],["Yellow Wool","yellow_wool"],["Zombie Head","zombie_head"]]; } catch (e) {
      return [
        ["stone","stone"],
        ["dirt","dirt"],
        ["cobblestone","cobblestone"]
      ];
    }
  })();

  const TWB_LOCALES = {
    en: {
      extName: 'Tw Bridge',
      blockConnect: 'reconnect saved link',
      blockDisconnect: 'disconnect ws',
      blockIsConnected: 'connected?',
      blockCurrentPlayer: 'connected player',
      blockRunCommand: 'execute [CMD]',
      blockTeleport: 'teleport agent [ID] to my player',
      blockDespawn: 'despawn agent [ID]',
      blockMove: 'move agent [ID] [DIRECTION] [BLOCKS] blocks',
      blockRotate: 'turn agent [ID] [TURN]',
      blockFacePlayer: 'turn agent [ID] toward player [PLAYER]',
      blockSlotActivate: 'activate agent [ID] slot [SLOT]',
      blockSlotSet: 'set agent [ID] slot [SLOT] to [BLOCK] x [COUNT]',
      blockPlace: 'place from agent [ID] toward [DIR]',
      dirForward: 'forward',
      dirBack: 'back',
      dirRight: 'right',
      dirLeft: 'left',
      dirUp: 'up',
      dirDown: 'down',
      turnLeft: 'left',
      turnRight: 'right'
    },
    ja: {
      extName: 'Tw Bridge',
      blockConnect: '保存されたリンクで再接続',
      blockDisconnect: 'WS を切断',
      blockIsConnected: '接続中？',
      blockCurrentPlayer: '接続中のプレイヤー',
      blockRunCommand: 'コマンド [CMD] を実行',
      blockTeleport: 'エージェント [ID] を自分のプレイヤーへテレポート',
      blockDespawn: 'エージェント [ID] を消す',
      blockMove: 'エージェント [ID] を [DIRECTION] に [BLOCKS] ブロック移動',
      blockRotate: 'エージェント [ID] の向きを [TURN] に変える',
      blockFacePlayer: 'プレイヤー [PLAYER] の方向にエージェント [ID] の向きを変える',
      blockSlotActivate: 'エージェント [ID] のスロット [SLOT] を有効にする',
      blockSlotSet: 'エージェント [ID] のスロット [SLOT] に [BLOCK] を [COUNT] 個セット',
      blockPlace: 'エージェント [ID] に [DIR] へ置かせる',
      dirForward: '前',
      dirBack: '後ろ',
      dirRight: '右',
      dirLeft: '左',
      dirUp: '上',
      dirDown: '下',
      turnLeft: '左',
      turnRight: '右'
    }
  };

  const TWB_ACTIVE_LANG = (() => {
    const requested = TWB_BOOT_CONFIG.lang || TWB_DEFAULT_LANG || '';
    const normalized = String(requested || '').trim().toLowerCase().replace(/_/g, '-');
    if (TWB_LOCALES[normalized]) return normalized;
    const base = normalized.split('-')[0];
    if (TWB_LOCALES[base]) return base;
    return 'en';
  })();

  function twbText(key) {
    const fallback = TWB_LOCALES.en || {};
    const dict = TWB_LOCALES[TWB_ACTIVE_LANG] || fallback;
    return (dict && dict[key]) || fallback[key] || key;
  }

  class Bridge {
    constructor(bootConfig) {
      this.boot = bootConfig || { host: '', token: '', lang: '' };
      this.ws = null;
      this.wsUrl = (this.boot.host && this.boot.host.trim()) || WS_DEFAULT;
      this.sessionId = null;
      this.boundPlayer = null;
      this.blockChoices = Array.isArray(TWB_BLOCK_CHOICES)
        ? TWB_BLOCK_CHOICES.map(entry => {
          if (Array.isArray(entry) && entry.length >= 2) {
            return { name: String(entry[0]), id: String(entry[1]) };
          }
          return null;
        }).filter(Boolean)
        : [];
      this.waiters = new Map();
      this.opening = false;
      this.connected = false;
      this.autoConnecting = false;
      this._autoConnectFromBoot();
    }

    agentBlockChoicesMenu() {
      if (this.blockChoices && this.blockChoices.length > 0) {
        return this.blockChoices.map(({ id, name }) => [name, id]);
      }
      return [
        ['stone', 'stone'],
        ['dirt', 'dirt'],
        ['cobblestone', 'cobblestone']
      ];
    }

    _uuid() {
      if (typeof crypto !== 'undefined' && crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async _ensureWS(url) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
      if (this.opening) {
        await new Promise(res => setTimeout(res, 100));
        return this._ensureWS(url);
      }
      this.opening = true;
      this.wsUrl = url || this.wsUrl || WS_DEFAULT;
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.id && this.waiters.has(msg.id)) {
            const { resolve, reject } = this.waiters.get(msg.id);
            this.waiters.delete(msg.id);
            msg.ok ? resolve(msg.result || {}) : reject(msg.error || 'error');
          }
        } catch {}
      };
      this.ws.onclose = () => { this.sessionId = null; this.boundPlayer = null; this.connected = false; };
      await new Promise((resolve, reject) => {
        this.ws.onopen = () => resolve();
        this.ws.onerror = () => { this.connected = false; reject(new Error('ws open failed')); };
        setTimeout(() => reject(new Error('ws open timeout')), 3000);
      });
      this.connected = true;
      this.opening = false;
    }

    _send(payload) {
      return new Promise((resolve, reject) => {
        const id = this._uuid();
        this.waiters.set(id, { resolve, reject });
        this.ws.send(JSON.stringify({ id, sessionId: this.sessionId, ...payload }));
        setTimeout(() => {
          if (this.waiters.has(id)) { this.waiters.delete(id); reject('timeout'); }
        }, 5000);
      });
    }

    async connectWithToken(url, token) {
      const trimmedToken = String(token || '').trim();
      if (!trimmedToken) throw new Error('token required');
      await this._ensureWS(url);
      const res = await this._send({
        cmd: 'token.start',
        token: trimmedToken
      });
      if (!res.sessionId) throw new Error('auth failed');
      this.sessionId = res.sessionId;
      this.boundPlayer = res.player || '';
      this.boot.token = trimmedToken;
      this.boot.host = this.wsUrl;
    }

    async reconnectSaved() {
      const url = this.boot.host && this.boot.host.trim();
      const token = this.boot.token && this.boot.token.trim();
      if (!url || !token) throw new Error('missing saved link info');
      await this.connectWithToken(url, token);
    }

    disconnect() {
      this.sessionId = null;
      this.boundPlayer = null;
      this.connected = false;
      if (this.ws) {
        try { this.ws.close(); } catch {}
      }
      this.ws = null;
      this.opening = false;
      this.waiters.forEach(({ reject }) => { try { reject('disconnected'); } catch {} });
      this.waiters.clear();
    }

    isConnected() {
      return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN && !!this.sessionId;
    }

    currentPlayer() {
      return this.boundPlayer || '';
    }

    setAvailableBlocks(blocks) {
      if (!Array.isArray(blocks)) {
        this.blockChoices = this.blockChoices && this.blockChoices.length ? this.blockChoices : [];
        return;
      }
      this.blockChoices = blocks
        .map(block => {
          if (Array.isArray(block) && block.length >= 2) {
            const name = String(block[0] || '').trim();
            const id = String(block[1] || '').trim();
            if (!id) return null;
            return { id, name: name || id };
          }
          const id = String(block.id || '').trim();
          const name = String(block.name || '').trim();
          if (!id) return null;
          return { id, name: name || id };
        })
        .filter(Boolean);
    }

    async _autoConnectFromBoot() {
      if (this.autoConnecting) return;
      if (!this.boot || !this.boot.token) return;
      this.autoConnecting = true;
      try {
        await this.connectWithToken(this.boot.host || this.wsUrl, this.boot.token);
        await this.fetchBlocksSafe();
      } catch (e) {
        console.warn('[twbridge] auto connect failed', e);
      } finally {
        this.autoConnecting = false;
      }
    }

    async fetchBlocksSafe() {
      try {
        this.setAvailableBlocks(TWB_BLOCK_CHOICES);
      } catch (e) { /* ignore */ }
    }

    async runCommand(command) {
      if (!this.sessionId) throw new Error('not connected');
      const cmd = String(command || '').trim();
      if (!cmd) throw new Error('command required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'command.run', command: cmd });
    }

    async teleportAgent(agentId) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      if (!id) throw new Error('agent id required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.teleportToPlayer', agentId: id });
    }

    async despawnAgent(agentId) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      if (!id) throw new Error('agent id required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.despawn', agentId: id });
    }

    async moveAgent(agentId, direction, blocks) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const dir = String(direction || '').trim().toLowerCase();
      const stepsRaw = Number(blocks);
      if (!id) throw new Error('agent id required');
      if (!['forward', 'back', 'right', 'left', 'up', 'down'].includes(dir)) throw new Error('invalid direction');
      if (!Number.isFinite(stepsRaw)) throw new Error('blocks must be a number');
      const steps = Math.max(1, Math.min(Math.round(Math.abs(stepsRaw)), 64));
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.move', agentId: id, direction: dir, blocks: steps });
    }

    async rotateAgent(agentId, turn) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const turnDir = String(turn || '').trim().toLowerCase();
      if (!id) throw new Error('agent id required');
      if (!['left', 'right'].includes(turnDir)) throw new Error('invalid turn');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.rotate', agentId: id, direction: turnDir });
    }

    async faceAgentToPlayer(agentId, targetPlayer) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const player = String(targetPlayer || '').trim();
      if (!id) throw new Error('agent id required');
      if (!player) throw new Error('target player required');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.facePlayer', agentId: id, targetPlayer: player });
    }

    async activateAgentSlot(agentId, slot) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const slotNum = Number(slot);
      if (!id) throw new Error('agent id required');
      if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > 27) throw new Error('slot must be 1-27');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.slotActivate', agentId: id, slot: slotNum });
    }

    async setAgentSlotBlock(agentId, block, amount, slot) {
        if (!this.sessionId) throw new Error('not connected');
        if (!this.boundPlayer) throw new Error('player not bound');
        const id = String(agentId || '').trim();
        const blockId = String(block || '').trim();
        const qty = Number(amount);
        const slotNum = Number(slot);
        if (!id) throw new Error('agent id required');
        if (!blockId) throw new Error('block required');
        if (!Number.isInteger(qty) || qty < 1 || qty > 64) throw new Error('amount must be 1-64');
        if (!Number.isInteger(slotNum) || slotNum < 1 || slotNum > 27) throw new Error('slot must be 1-27');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.slotSetBlock', agentId: id, block: blockId, amount: qty, slot: slotNum });
    }

    async placeBlock(agentId, dir) {
      if (!this.sessionId) throw new Error('not connected');
      if (!this.boundPlayer) throw new Error('player not bound');
      const id = String(agentId || '').trim();
      const direction = String(dir || '').trim().toLowerCase();
      if (!id) throw new Error('agent id required');
      if (!['forward','back','left','right','up','down'].includes(direction)) throw new Error('invalid direction');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) await this._ensureWS();
      return this._send({ cmd: 'agent.place', agentId: id, direction });
    }
  }

  const bridge = new Bridge(TWB_BOOT_CONFIG);

  class TwBridgeExt {
    getInfo() {
      return {
        id: 'twbridge',
        name: twbText('extName'),
        color1: '#4b87ff',
        color2: '#2a5bd7',
        blocks: [
          {
            opcode: 'connect',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockConnect')
          },
          {
            opcode: 'disconnect',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockDisconnect')
          },
          {
            opcode: 'isConnected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: twbText('blockIsConnected')
          },
          {
            opcode: 'currentPlayer',
            blockType: Scratch.BlockType.REPORTER,
            text: twbText('blockCurrentPlayer')
          },
          {
            opcode: 'runCommand',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockRunCommand'),
            arguments: {
              CMD: { type: Scratch.ArgumentType.STRING, defaultValue: 'say hello from tw' }
            }
          },
          {
            opcode: 'teleportAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockTeleport'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'despawnAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockDespawn'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' }
            }
          },
          {
            opcode: 'moveAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockMove'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentDirections',
                defaultValue: 'forward'
              },
              BLOCKS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
            }
          },
          {
            opcode: 'rotateAgent',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockRotate'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              TURN: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentTurnDirections',
                defaultValue: 'left'
              }
            }
          },
          {
            opcode: 'faceAgentToPlayer',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockFacePlayer'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              PLAYER: { type: Scratch.ArgumentType.STRING, defaultValue: 'Steve' }
            }
          },
          {
            opcode: 'activateAgentSlot',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockSlotActivate'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'setAgentSlotBlock',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockSlotSet'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              BLOCK: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentBlockChoices',
                defaultValue: 'stone'
              },
              COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 16 },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'placeBlock',
            blockType: Scratch.BlockType.COMMAND,
            text: twbText('blockPlace'),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'agent1' },
              DIR: {
                type: Scratch.ArgumentType.STRING,
                menu: 'agentPlaceDirections',
                defaultValue: 'forward'
              }
            }
          }
        ],
        menus: {
          agentDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('dirForward'), value: 'forward' },
              { text: twbText('dirBack'), value: 'back' },
              { text: twbText('dirRight'), value: 'right' },
              { text: twbText('dirLeft'), value: 'left' },
              { text: twbText('dirUp'), value: 'up' },
              { text: twbText('dirDown'), value: 'down' }
            ]
          },
          agentTurnDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('turnLeft'), value: 'left' },
              { text: twbText('turnRight'), value: 'right' }
            ]
          },
          agentBlockChoices: {
            acceptReporters: false,
            items: 'agentBlockChoicesMenu'
          },
          agentPlaceDirections: {
            acceptReporters: false,
            items: [
              { text: twbText('dirForward'), value: 'forward' },
              { text: twbText('dirBack'), value: 'back' },
              { text: twbText('dirRight'), value: 'right' },
              { text: twbText('dirLeft'), value: 'left' },
              { text: twbText('dirUp'), value: 'up' },
              { text: twbText('dirDown'), value: 'down' }
            ]
          }
        }
      };
    }

    agentBlockChoicesMenu() {
      return bridge.agentBlockChoicesMenu();
    }

    async connect() {
      await bridge.reconnectSaved();
      await bridge.fetchBlocksSafe();
    }
    disconnect() { bridge.disconnect(); }
    isConnected() { return bridge.isConnected(); }
    currentPlayer() { return bridge.currentPlayer(); }
    async runCommand(args) { await bridge.runCommand(String(args.CMD || "")); }
    async teleportAgent(args) { await bridge.teleportAgent(String(args.ID || "")); }
    async despawnAgent(args) { await bridge.despawnAgent(String(args.ID || "")); }
    async moveAgent(args) {
      await bridge.moveAgent(
        String(args.ID || ""),
        args.DIRECTION || "forward",
        Number(args.BLOCKS || 0)
      );
    }
    async rotateAgent(args) {
      await bridge.rotateAgent(
        String(args.ID || ""),
        args.TURN || "left"
      );
    }
    async faceAgentToPlayer(args) {
      await bridge.faceAgentToPlayer(
        String(args.ID || ""),
        String(args.PLAYER || "")
      );
    }
    async activateAgentSlot(args) {
      await bridge.activateAgentSlot(
        String(args.ID || ""),
        Number(args.SLOT || 1)
      );
    }
    async setAgentSlotBlock(args) {
      await bridge.setAgentSlotBlock(
        String(args.ID || ""),
        String(args.BLOCK || "stone"),
        Number(args.COUNT || 1),
        Number(args.SLOT || 1)
      );
    }
    async placeBlock(args) {
      await bridge.placeBlock(
        String(args.ID || ""),
        args.DIR || "forward"
      );
    }
  }

  Scratch.extensions.register(new TwBridgeExt());
})();
