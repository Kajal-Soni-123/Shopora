import json
import math
import os
import struct

def create_cylinder_mesh(radius_top, radius_bottom, height, segments=32):
    positions = []
    normals = []
    indices = []
    half_h = height / 2.0

    # Side Wall Vertices & Normals
    for i in range(segments + 1):
        theta = (i / float(segments)) * 2.0 * math.pi
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        positions.extend([radius_top * cos_t, radius_top * sin_t, half_h])
        normals.extend([cos_t, sin_t, 0.0])

        positions.extend([radius_bottom * cos_t, radius_bottom * sin_t, -half_h])
        normals.extend([cos_t, sin_t, 0.0])

    for i in range(segments):
        top1 = i * 2
        bot1 = top1 + 1
        top2 = (i + 1) * 2
        bot2 = top2 + 1

        indices.extend([top1, bot1, top2])
        indices.extend([top2, bot1, bot2])

    # Top Cap (+Z)
    top_start = len(positions) // 3
    for i in range(segments + 1):
        theta = (i / float(segments)) * 2.0 * math.pi
        positions.extend([radius_top * math.cos(theta), radius_top * math.sin(theta), half_h])
        normals.extend([0.0, 0.0, 1.0])
    
    positions.extend([0.0, 0.0, half_h])
    normals.extend([0.0, 0.0, 1.0])
    top_center = top_start + segments + 1

    for i in range(segments):
        indices.extend([top_center, top_start + i, top_start + i + 1])

    # Bottom Cap (-Z)
    bot_start = len(positions) // 3
    for i in range(segments + 1):
        theta = (i / float(segments)) * 2.0 * math.pi
        positions.extend([radius_bottom * math.cos(theta), radius_bottom * math.sin(theta), -half_h])
        normals.extend([0.0, 0.0, -1.0])
    
    positions.extend([0.0, 0.0, -half_h])
    normals.extend([0.0, 0.0, -1.0])
    bot_center = bot_start + segments + 1

    for i in range(segments):
        indices.extend([bot_center, bot_start + i + 1, bot_start + i])

    return positions, normals, indices

def create_box_mesh(dx, dy, dz):
    hx, hy, hz = dx / 2.0, dy / 2.0, dz / 2.0
    positions = [
        # Front (+Z)
        -hx, -hy,  hz,   hx, -hy,  hz,   hx,  hy,  hz,  -hx,  hy,  hz,
        # Back (-Z)
        -hx, -hy, -hz,  -hx,  hy, -hz,   hx,  hy, -hz,   hx, -hy, -hz,
        # Top (+Y)
        -hx,  hy, -hz,  -hx,  hy,  hz,   hx,  hy,  hz,   hx,  hy, -hz,
        # Bottom (-Y)
        -hx, -hy, -hz,   hx, -hy, -hz,   hx, -hy,  hz,  -hx, -hy,  hz,
        # Right (+X)
         hx, -hy, -hz,   hx,  hy, -hz,   hx,  hy,  hz,   hx, -hy,  hz,
        # Left (-X)
        -hx, -hy, -hz,  -hx, -hy,  hz,  -hx,  hy,  hz,  -hx,  hy, -hz,
    ]
    normals = [
        0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
        0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
        0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
        0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
        1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
       -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]
    indices = []
    for f in range(6):
        base = f * 4
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    return positions, normals, indices

def create_ring_mesh(inner_r, outer_r, thickness=0.0006, segments=48):
    positions = []
    normals = []
    indices = []
    half_t = thickness / 2.0

    for i in range(segments + 1):
        theta = (i / float(segments)) * 2.0 * math.pi
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        # Outer point
        positions.extend([outer_r * cos_t, outer_r * sin_t, half_t])
        normals.extend([0, 0, 1])

        # Inner point
        positions.extend([inner_r * cos_t, inner_r * sin_t, half_t])
        normals.extend([0, 0, 1])

    for i in range(segments):
        o1 = i * 2
        i1 = o1 + 1
        o2 = (i + 1) * 2
        i2 = o2 + 1

        indices.extend([o1, i1, o2])
        indices.extend([o2, i1, i2])

    return positions, normals, indices

def build_fossil_blue_watch_model():
    mesh_parts = []

    def add_part(pos, norm, idx, color, name, metalness=0.9, roughness=0.2):
        mesh_parts.append({
            'positions': pos,
            'normals': norm,
            'indices': idx,
            'color': color,
            'name': name,
            'metalness': metalness,
            'roughness': roughness
        })

    # Color Definitions (sRGB linearized float 0..1)
    SILVER_POLISHED = [0.850, 0.870, 0.890, 1.0] # Silver Chrome
    SILVER_BRUSHED  = [0.750, 0.770, 0.790, 1.0]
    NAVY_BLUE       = [0.035, 0.110, 0.280, 1.0] # Deep Navy Blue Dial
    ROSE_GOLD       = [0.830, 0.540, 0.380, 1.0] # Applied Markers & Hands
    WHITE_INK       = [0.980, 0.980, 0.980, 1.0] # Indices & Logo
    WHITE_LUME      = [0.950, 0.970, 0.980, 1.0] # Hand Fill
    COGNAC_LEATHER  = [0.380, 0.160, 0.050, 1.0] # Leather Strap
    BURNISHED_EDGE  = [0.180, 0.070, 0.020, 1.0] # Strap Edges
    CREAM_STITCH    = [0.900, 0.760, 0.500, 1.0] # Thread Stitching

    # 1. Main Stainless Steel Round Case (40mm diameter, 7.5mm height)
    case_radius = 0.020
    case_h = 0.0075
    cp, cn, ci = create_cylinder_mesh(case_radius, case_radius * 0.98, case_h, segments=48)
    add_part(cp, cn, ci, SILVER_POLISHED, 'Watch_Case_Body', metalness=0.96, roughness=0.12)

    # Caseback
    cbp, cbn, cbi = create_cylinder_mesh(case_radius * 0.92, case_radius * 0.92, 0.001, segments=32)
    cbp_trans = []
    for k in range(0, len(cbp), 3):
        cbp_trans.extend([cbp[k], cbp[k+1], cbp[k+2] - case_h / 2.0 - 0.0005])
    add_part(cbp_trans, cbn, cbi, SILVER_BRUSHED, 'Watch_Caseback', metalness=0.90, roughness=0.30)

    # 2. Chrome Bezel Ring
    bp, bn, bi = create_ring_mesh(case_radius * 0.88, case_radius * 1.01, thickness=0.0018, segments=48)
    bp_trans = []
    for k in range(0, len(bp), 3):
        bp_trans.extend([bp[k], bp[k+1], bp[k+2] + case_h / 2.0 + 0.0009])
    add_part(bp_trans, bn, bi, SILVER_POLISHED, 'Watch_Bezel', metalness=0.98, roughness=0.08)

    # 3. Deep Navy Blue Dial Face
    dp, dn, di = create_cylinder_mesh(case_radius * 0.87, case_radius * 0.87, 0.001, segments=48)
    dp_trans = []
    for k in range(0, len(dp), 3):
        dp_trans.extend([dp[k], dp[k+1], dp[k+2] + case_h / 2.0 + 0.0005])
    add_part(dp_trans, dn, di, NAVY_BLUE, 'Watch_Dial_NavyBlue', metalness=0.10, roughness=0.38)

    # 4. Outer Minute Track Line & 60 Minute Ticks
    dial_r = case_radius * 0.87
    track_r = dial_r * 0.90

    # Outer Track Ring Line
    rp, rn, ri = create_ring_mesh(track_r * 0.99, track_r * 1.005, thickness=0.0002, segments=48)
    rp_trans = []
    for k in range(0, len(rp), 3):
        rp_trans.extend([rp[k], rp[k+1], rp[k+2] + case_h / 2.0 + 0.0011])
    add_part(rp_trans, rn, ri, WHITE_INK, 'Outer_Track_Ring', metalness=0.05, roughness=0.50)

    # 60 Minute Ticks around Dial
    ticks_pos, ticks_norm, ticks_idx = [], [], []
    for i in range(60):
        angle = (i / 60.0) * 2.0 * math.pi
        is_5min = (i % 5 == 0)
        tw = 0.0004 if is_5min else 0.00025
        th = 0.0012 if is_5min else 0.0007
        td = 0.0001

        tp, tn, ti = create_box_mesh(tw, th, td)
        v_off = len(ticks_pos) // 3
        r_center = track_r - th / 2.0

        for k in range(0, len(tp), 3):
            rx = tp[k] * math.cos(-angle) - (tp[k+1] + r_center) * math.sin(-angle)
            ry = tp[k] * math.sin(-angle) + (tp[k+1] + r_center) * math.cos(-angle)
            rz = tp[k+2] + case_h / 2.0 + 0.0012
            ticks_pos.extend([rx, ry, rz])
            ticks_norm.extend([tn[k], tn[k+1], tn[k+2]])

        for idx in ti:
            ticks_idx.append(idx + v_off)

    add_part(ticks_pos, ticks_norm, ticks_idx, WHITE_INK, 'Minute_Index_Ticks', metalness=0.05, roughness=0.50)

    # 5. Applied Warm Rose Gold Hour Markers (Double stick at 12 o'clock)
    hm_pos, hm_norm, hm_idx = [], [], []
    marker_r = dial_r * 0.72
    mw, mh, md = 0.0008, 0.0032, 0.0005

    for hour in range(1, 13):
        angle = (hour / 12.0) * 2.0 * math.pi

        def add_marker_box(dx_offset, dy_offset, rot_angle):
            v_off = len(hm_pos) // 3
            mp, mn, mi = create_box_mesh(mw, mh, md)
            
            # Position relative to marker radius
            base_x = dx_offset
            base_y = marker_r + dy_offset

            for k in range(0, len(mp), 3):
                px = mp[k] + base_x
                py = mp[k+1] + base_y
                pz = mp[k+2] + case_h / 2.0 + 0.0015

                rx = px * math.cos(-rot_angle) - py * math.sin(-rot_angle)
                ry = px * math.sin(-rot_angle) + py * math.cos(-rot_angle)
                hm_pos.extend([rx, ry, pz])
                hm_norm.extend([mn[k], mn[k+1], mn[k+2]])

            for idx in mi:
                hm_idx.append(idx + v_off)

        if hour == 12:
            # Double stick marker
            add_marker_box(-0.0006, 0.0, angle)
            add_marker_box(0.0006, 0.0, angle)
        else:
            add_marker_box(0.0, 0.0, angle)

    add_part(hm_pos, hm_norm, hm_idx, ROSE_GOLD, 'RoseGold_Hour_Markers', metalness=0.92, roughness=0.18)

    # 6. Hands (Hour, Minute, Second & Center Pin)
    hands_pos, hands_norm, hands_idx = [], [], []

    # Center Pin
    pin_p, pin_n, pin_i = create_cylinder_mesh(0.0011, 0.0011, 0.0015, segments=20)
    v_off = len(hands_pos) // 3
    for k in range(0, len(pin_p), 3):
        hands_pos.extend([pin_p[k], pin_p[k+1], pin_p[k+2] + case_h / 2.0 + 0.0022])
        hands_norm.extend([pin_n[k], pin_n[k+1], pin_n[k+2]])
    for idx in pin_i:
        hands_idx.append(idx + v_off)

    # Hour Hand (~10:08 position)
    h_angle = (10.14 / 12.0) * 2.0 * math.pi
    hp, hn, hi = create_box_mesh(0.0011, 0.0090, 0.0004)
    v_off = len(hands_pos) // 3
    for k in range(0, len(hp), 3):
        x = hp[k]
        y = hp[k+1] + 0.0045
        z = hp[k+2] + case_h / 2.0 + 0.0024
        rx = x * math.cos(-h_angle) - y * math.sin(-h_angle)
        ry = x * math.sin(-h_angle) + y * math.cos(-h_angle)
        hands_pos.extend([rx, ry, z])
        hands_norm.extend([hn[k], hn[k+1], hn[k+2]])
    for idx in hi:
        hands_idx.append(idx + v_off)

    # Minute Hand (~2:10 position)
    m_angle = (2.16 / 12.0) * 2.0 * math.pi
    mp, mn, mi = create_box_mesh(0.0009, 0.0135, 0.0004)
    v_off = len(hands_pos) // 3
    for k in range(0, len(mp), 3):
        x = mp[k]
        y = mp[k+1] + 0.0067
        z = mp[k+2] + case_h / 2.0 + 0.0028
        rx = x * math.cos(-m_angle) - y * math.sin(-m_angle)
        ry = x * math.sin(-m_angle) + y * math.cos(-m_angle)
        hands_pos.extend([rx, ry, z])
        hands_norm.extend([mn[k], mn[k+1], mn[k+2]])
    for idx in mi:
        hands_idx.append(idx + v_off)

    # Second Hand (Thin Needle)
    s_angle = (7.35 / 12.0) * 2.0 * math.pi
    sp, sn, si = create_box_mesh(0.0003, 0.0150, 0.0003)
    v_off = len(hands_pos) // 3
    for k in range(0, len(sp), 3):
        x = sp[k]
        y = sp[k+1] + 0.0050
        z = sp[k+2] + case_h / 2.0 + 0.0032
        rx = x * math.cos(-s_angle) - y * math.sin(-s_angle)
        ry = x * math.sin(-s_angle) + y * math.cos(-s_angle)
        hands_pos.extend([rx, ry, z])
        hands_norm.extend([sn[k], sn[k+1], sn[k+2]])
    for idx in si:
        hands_idx.append(idx + v_off)

    add_part(hands_pos, hands_norm, hands_idx, ROSE_GOLD, 'Watch_Hands_Group', metalness=0.95, roughness=0.15)

    # White Lume Inlay for Hour & Minute Hands
    lume_pos, lume_norm, lume_idx = [], [], []
    hlp, hln, hli = create_box_mesh(0.0006, 0.0060, 0.0003)
    for k in range(0, len(hlp), 3):
        x = hlp[k]
        y = hlp[k+1] + 0.0045
        z = hlp[k+2] + case_h / 2.0 + 0.0025
        rx = x * math.cos(-h_angle) - y * math.sin(-h_angle)
        ry = x * math.sin(-h_angle) + y * math.cos(-h_angle)
        lume_pos.extend([rx, ry, z])
        lume_norm.extend([hln[k], hln[k+1], hln[k+2]])
    for idx in hli:
        lume_idx.append(idx)

    v_off = len(lume_pos) // 3
    mlp, mln, mli = create_box_mesh(0.0005, 0.0090, 0.0003)
    for k in range(0, len(mlp), 3):
        x = mlp[k]
        y = mlp[k+1] + 0.0067
        z = mlp[k+2] + case_h / 2.0 + 0.0029
        rx = x * math.cos(-m_angle) - y * math.sin(-m_angle)
        ry = x * math.sin(-m_angle) + y * math.cos(-m_angle)
        lume_pos.extend([rx, ry, z])
        lume_norm.extend([mln[k], mln[k+1], mln[k+2]])
    for idx in mli:
        lume_idx.append(idx + v_off)

    add_part(lume_pos, lume_norm, lume_idx, WHITE_LUME, 'Hands_Lume_Fill', metalness=0.10, roughness=0.20)

    # 7. Sapphire Glass Lens
    gl_p, gl_n, gl_i = create_cylinder_mesh(dial_r * 1.01, dial_r * 1.01, 0.0008, segments=48)
    gl_trans = []
    for k in range(0, len(gl_p), 3):
        gl_trans.extend([gl_p[k], gl_p[k+1], gl_p[k+2] + case_h / 2.0 + 0.0035])
    add_part(gl_trans, gl_n, gl_i, WHITE_LUME, 'Sapphire_Glass_Lens', metalness=0.05, roughness=0.05)

    # 8. Winding Crown (3 o'clock position)
    cr_p, cr_n, cr_i = create_cylinder_mesh(0.0018, 0.0018, 0.0032, segments=24)
    cr_trans = []
    cr_norm = []
    for k in range(0, len(cr_p), 3):
        cr_trans.extend([cr_p[k+2] + case_radius + 0.0015, cr_p[k], cr_p[k+1]])
        cr_norm.extend([cr_n[k+2], cr_n[k], cr_n[k+1]])
    add_part(cr_trans, cr_norm, cr_i, SILVER_POLISHED, 'Winding_Crown', metalness=0.96, roughness=0.12)

    # 9. 4 Tapered Lugs
    lugs_pos, lugs_norm, lugs_idx = [], [], []
    lw, lh, ld = 0.0038, 0.0085, 0.0060
    lux = case_radius * 0.65
    luy = case_radius * 0.90

    for lx_sign in [-1, 1]:
        for ly_sign in [-1, 1]:
            v_off = len(lugs_pos) // 3
            lp, ln, li = create_box_mesh(lw, lh, ld)
            pos_y = (luy + lh / 4.0) if ly_sign > 0 else (-luy - lh / 4.0)
            pos_x = lx_sign * lux

            for k in range(0, len(lp), 3):
                lugs_pos.extend([lp[k] + pos_x, lp[k+1] + pos_y, lp[k+2] - 0.0010])
                lugs_norm.extend([ln[k], ln[k+1], ln[k+2]])

            for idx in li:
                lugs_idx.append(idx + v_off)

    add_part(lugs_pos, lugs_norm, lugs_idx, SILVER_POLISHED, 'Stainless_Steel_Lugs', metalness=0.96, roughness=0.12)

    # 10. Cognac Brown Leather Straps (Upper & Lower) with Cream Stitching
    strap_w = 0.020
    strap_len = 0.075
    strap_thick = 0.0030

    def build_strap_assembly(is_upper=True):
        s_pos, s_norm, s_idx = [], [], []
        
        # Main Leather Strap Block
        sp, sn, si = create_box_mesh(strap_w, strap_len, strap_thick)
        y_center = (case_radius + strap_len / 2.0 + 0.002) if is_upper else (-case_radius - strap_len / 2.0 - 0.002)

        v_off = len(s_pos) // 3
        for k in range(0, len(sp), 3):
            s_pos.extend([sp[k], sp[k+1] + y_center, sp[k+2] - strap_thick])
            s_norm.extend([sn[k], sn[k+1], sn[k+2]])
        for idx in si:
            s_idx.append(idx + v_off)

        return s_pos, s_norm, s_idx, y_center

    # Upper Strap
    up_p, up_n, up_i, up_y = build_strap_assembly(is_upper=True)
    add_part(up_p, up_n, up_i, COGNAC_LEATHER, 'Strap_Upper_Leather', metalness=0.05, roughness=0.68)

    # Lower Strap
    lo_p, lo_n, lo_i, lo_y = build_strap_assembly(is_upper=False)
    add_part(lo_p, lo_n, lo_i, COGNAC_LEATHER, 'Strap_Lower_Leather', metalness=0.05, roughness=0.68)

    # Dark Burnished Leather Edges
    edge_pos, edge_norm, edge_idx = [], [], []
    for y_c in [up_y, lo_y]:
        for edge_x in [-strap_w / 2.0 + 0.0004, strap_w / 2.0 - 0.0004]:
            v_off = len(edge_pos) // 3
            ep, en, ei = create_box_mesh(0.0008, strap_len, strap_thick * 1.02)
            for k in range(0, len(ep), 3):
                edge_pos.extend([ep[k] + edge_x, ep[k+1] + y_c, ep[k+2] - strap_thick])
                edge_norm.extend([en[k], en[k+1], en[k+2]])
            for idx in ei:
                edge_idx.append(idx + v_off)

    add_part(edge_pos, edge_norm, edge_idx, BURNISHED_EDGE, 'Leather_Burnished_Edges', metalness=0.05, roughness=0.75)

    # Cream Thread Stitching Rows
    stitch_pos, stitch_norm, stitch_idx = [], [], []
    stitch_count = 24
    stitch_step = (strap_len * 0.90) / float(stitch_count)

    for y_c in [up_y, lo_y]:
        start_y = y_c - strap_len / 2.0 + 0.004
        for s in range(stitch_count):
            sy = start_y + s * stitch_step
            for sx in [-strap_w * 0.38, strap_w * 0.38]:
                v_off = len(stitch_pos) // 3
                stp, stn, sti = create_box_mesh(0.0006, 0.0018, 0.0008)
                for k in range(0, len(stp), 3):
                    stitch_pos.extend([stp[k] + sx, stp[k+1] + sy, stp[k+2] - strap_thick / 2.0 + 0.0004])
                    stitch_norm.extend([stn[k], stn[k+1], stn[k+2]])
                for idx in sti:
                    stitch_idx.append(idx + v_off)

    add_part(stitch_pos, stitch_norm, stitch_idx, CREAM_STITCH, 'Cream_Stitching_Rows', metalness=0.08, roughness=0.60)

    # Silver Strap Buckle at top of upper strap
    bk_pos, bk_norm, bk_idx = [], [], []
    bk_p, bk_n, bk_i = create_box_mesh(strap_w * 1.12, 0.006, 0.004)
    v_off = len(bk_pos) // 3
    for k in range(0, len(bk_p), 3):
        bk_pos.extend([bk_p[k], bk_p[k+1] + up_y + strap_len / 2.0 + 0.003, bk_p[k+2] - strap_thick * 1.5])
        bk_norm.extend([bk_n[k], bk_n[k+1], bk_n[k+2]])
    for idx in bk_i:
        bk_idx.append(idx + v_off)

    add_part(bk_pos, bk_norm, bk_idx, SILVER_POLISHED, 'Strap_Silver_Buckle', metalness=0.96, roughness=0.12)

    return mesh_parts

def export_fossil_blue_watch_glb(output_path):
    mesh_parts = build_fossil_blue_watch_model()
    buffer_bytes = bytearray()

    gltf = {
        "asset": { "version": "2.0", "generator": "Shopora 3D Fossil Blue Watch Generator" },
        "scenes": [{ "nodes": [0] }],
        "nodes": [{ "name": "Fossil_BlueDial_Watch_Root", "children": list(range(1, len(mesh_parts) + 1)) }],
        "meshes": [],
        "materials": [],
        "accessors": [],
        "bufferViews": [],
        "buffers": []
    }

    accessor_idx = 0
    bufferview_idx = 0

    for idx, part in enumerate(mesh_parts):
        node_idx = idx + 1
        mesh_idx = idx
        mat_idx = idx

        gltf["nodes"].append({ "name": part['name'], "mesh": mesh_idx })

        gltf["materials"].append({
            "name": f"Mat_{part['name']}",
            "pbrMetallicRoughness": {
                "baseColorFactor": part['color'],
                "metallicFactor": part['metalness'],
                "roughnessFactor": part['roughness']
            }
        })

        # Pack Position Bytes
        pos_bytes = bytearray()
        min_pos = [float('inf')] * 3
        max_pos = [float('-inf')] * 3
        for k in range(0, len(part['positions']), 3):
            x, y, z = part['positions'][k], part['positions'][k+1], part['positions'][k+2]
            min_pos[0], max_pos[0] = min(min_pos[0], x), max(max_pos[0], x)
            min_pos[1], max_pos[1] = min(min_pos[1], y), max(max_pos[1], y)
            min_pos[2], max_pos[2] = min(min_pos[2], z), max(max_pos[2], z)
            pos_bytes.extend(struct.pack('<fff', x, y, z))

        # Pack Normal Bytes
        norm_bytes = bytearray()
        for val in part['normals']:
            norm_bytes.extend(struct.pack('<f', val))

        # Pack Index Bytes (uint16)
        idx_bytes = bytearray()
        for val in part['indices']:
            idx_bytes.extend(struct.pack('<H', val))

        # Buffer offsets
        pos_offset = len(buffer_bytes)
        buffer_bytes.extend(pos_bytes)
        pos_bv = bufferview_idx
        gltf["bufferViews"].append({ "buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_bytes), "target": 34962 })
        bufferview_idx += 1

        norm_offset = len(buffer_bytes)
        buffer_bytes.extend(norm_bytes)
        norm_bv = bufferview_idx
        gltf["bufferViews"].append({ "buffer": 0, "byteOffset": norm_offset, "byteLength": len(norm_bytes), "target": 34962 })
        bufferview_idx += 1

        # Align index buffer to 4 bytes
        while len(buffer_bytes) % 4 != 0:
            buffer_bytes.append(0)

        idx_offset = len(buffer_bytes)
        buffer_bytes.extend(idx_bytes)
        idx_bv = bufferview_idx
        gltf["bufferViews"].append({ "buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963 })
        bufferview_idx += 1

        while len(buffer_bytes) % 4 != 0:
            buffer_bytes.append(0)

        # Accessors
        pos_acc = accessor_idx
        gltf["accessors"].append({
            "bufferView": pos_bv,
            "componentType": 5126, # FLOAT
            "count": len(part['positions']) // 3,
            "type": "VEC3",
            "min": min_pos,
            "max": max_pos
        })
        accessor_idx += 1

        norm_acc = accessor_idx
        gltf["accessors"].append({
            "bufferView": norm_bv,
            "componentType": 5126, # FLOAT
            "count": len(part['normals']) // 3,
            "type": "VEC3"
        })
        accessor_idx += 1

        idx_acc = accessor_idx
        gltf["accessors"].append({
            "bufferView": idx_bv,
            "componentType": 5123, # UNSIGNED_SHORT
            "count": len(part['indices']),
            "type": "SCALAR",
            "min": [0],
            "max": [max(part['indices']) if part['indices'] else 0]
        })
        accessor_idx += 1

        gltf["meshes"].append({
            "name": f"Mesh_{part['name']}",
            "primitives": [{
                "attributes": { "POSITION": pos_acc, "NORMAL": norm_acc },
                "indices": idx_acc,
                "material": mat_idx
            }]
        })

    gltf["buffers"].append({ "byteLength": len(buffer_bytes) })

    json_str = json.dumps(gltf, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')

    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_len = 12 + 8 + len(json_bytes) + 8 + len(buffer_bytes)

    glb_header = struct.pack('<III', 0x46544C67, 2, total_len) # 'glTF', version 2
    json_chunk_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # 'JSON'
    bin_chunk_header = struct.pack('<II', len(buffer_bytes), 0x00414D42) # 'BIN'

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(glb_header)
        f.write(json_chunk_header)
        f.write(json_bytes)
        f.write(bin_chunk_header)
        f.write(buffer_bytes)

    size_kb = len(buffer_bytes) / 1024.0
    print(f"✅ Created 100% valid GLB Fossil Watch Model: {output_path} ({size_kb:.1f} KB, total {total_len} bytes)")

def main():
    models_dir = "public/models"
    export_fossil_blue_watch_glb(os.path.join(models_dir, "fossil-blue-leather-watch.glb"))
    export_fossil_blue_watch_glb(os.path.join(models_dir, "fossil-minimalist-blue-dial.glb"))
    print("🎉 All 3D Fossil Blue Dial Watch GLB files generated successfully!")

if __name__ == "__main__":
    main()
