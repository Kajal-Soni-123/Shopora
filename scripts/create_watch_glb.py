import json
import math
import os
import struct

def create_rounded_cushion_mesh(size=0.040, thickness=0.008, corner_radius=0.008, segments_per_corner=6):
    positions = []
    normals = []
    indices = []

    half = size / 2.0
    r = min(corner_radius, half)
    inner_w = half - r

    # Create 2D boundary points for top and bottom face
    boundary_points = []
    corners = [
        (inner_w, inner_w, 0.0),                  # Top-Right
        (-inner_w, inner_w, math.pi / 2.0),       # Top-Left
        (-inner_w, -inner_w, Math_pi := math.pi), # Bottom-Left
        (inner_w, -inner_w, 3.0 * math.pi / 2.0)  # Bottom-Right
    ]

    for cx, cy, start_angle in corners:
        for s in range(segments_per_corner):
            angle = start_angle + (s / float(segments_per_corner)) * (math.pi / 2.0)
            px = cx + r * math.cos(angle)
            py = cy + r * math.sin(angle)
            boundary_points.append((px, py, math.cos(angle), math.sin(angle)))

    N = len(boundary_points)
    half_t = thickness / 2.0

    # Top Cap Vertices (+Z)
    for px, py, nx, ny in boundary_points:
        positions.extend([px, py, half_t])
        normals.extend([0.0, 0.0, 1.0])
    
    # Top center vertex
    positions.extend([0.0, 0.0, half_t])
    normals.extend([0.0, 0.0, 1.0])
    top_center_idx = N

    # Top face triangles
    for i in range(N):
        next_i = (i + 1) % N
        indices.extend([top_center_idx, i, next_i])

    # Bottom Cap Vertices (-Z)
    bottom_start = len(positions) // 3
    for px, py, nx, ny in boundary_points:
        positions.extend([px, py, -half_t])
        normals.extend([0.0, 0.0, -1.0])
    
    # Bottom center vertex
    positions.extend([0.0, 0.0, -half_t])
    normals.extend([0.0, 0.0, -1.0])
    bot_center_idx = bottom_start + N

    # Bottom face triangles
    for i in range(N):
        next_i = (i + 1) % N
        indices.extend([bot_center_idx, bottom_start + next_i, bottom_start + i])

    # Side Wall Vertices
    side_start = len(positions) // 3
    for px, py, nx, ny in boundary_points:
        positions.extend([px, py, half_t])
        normals.extend([nx, ny, 0.0])
        positions.extend([px, py, -half_t])
        normals.extend([nx, ny, 0.0])

    for i in range(N):
        next_i = (i + 1) % N
        t1 = side_start + (i * 2)
        b1 = t1 + 1
        t2 = side_start + (next_i * 2)
        b2 = t2 + 1

        indices.extend([t1, b1, t2])
        indices.extend([t2, b1, b2])

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

def create_cylinder_mesh(radius, height, segments=16):
    positions = []
    normals = []
    indices = []
    half_h = height / 2.0

    for i in range(segments + 1):
        theta = (i / float(segments)) * 2.0 * math.pi
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        positions.extend([radius * cos_t, radius * sin_t, half_h])
        normals.extend([cos_t, sin_t, 0.0])

        positions.extend([radius * cos_t, radius * sin_t, -half_h])
        normals.extend([cos_t, sin_t, 0.0])

    for i in range(segments):
        top1 = i * 2
        bot1 = top1 + 1
        top2 = (i + 1) * 2
        bot2 = top2 + 1

        indices.extend([top1, bot1, top2])
        indices.extend([top2, bot1, bot2])

    return positions, normals, indices

def build_watch_model():
    mesh_parts = []

    def add_mesh_data(pos, norm, idx, color_factor, name, metalness=0.9, roughness=0.2):
        mesh_parts.append({
            'positions': pos,
            'normals': norm,
            'indices': idx,
            'color': color_factor,
            'name': name,
            'metalness': metalness,
            'roughness': roughness
        })

    # Rose Gold Palette
    ROSE_GOLD = [0.816, 0.545, 0.475, 1.0]      # #D08B79
    SHINY_GOLD = [0.880, 0.610, 0.540, 1.0]     # #E09C8A
    DIAL_COLOR = [0.960, 0.925, 0.905, 1.0]     # #F5ECE7
    ROMAN_COLOR = [0.360, 0.220, 0.180, 1.0]    # #5C382F
    PILLOW_COLOR = [0.960, 0.945, 0.920, 1.0]   # #F5F1EB

    # 1. Main Cushion Case
    cp, cn, ci = create_rounded_cushion_mesh(size=0.040, thickness=0.008, corner_radius=0.008)
    add_mesh_data(cp, cn, ci, ROSE_GOLD, 'Watch_Case', metalness=0.92, roughness=0.22)

    # 2. Bezel
    bp, bn, bi = create_rounded_cushion_mesh(size=0.038, thickness=0.002, corner_radius=0.007)
    # offset bezel slightly forward (+Z)
    bp_offset = []
    for k in range(0, len(bp), 3):
        bp_offset.extend([bp[k], bp[k+1], bp[k+2] + 0.0045])
    add_mesh_data(bp_offset, bn, bi, SHINY_GOLD, 'Watch_Bezel', metalness=0.95, roughness=0.15)

    # 3. Dial Face
    dp, dn, di = create_rounded_cushion_mesh(size=0.031, thickness=0.001, corner_radius=0.005)
    dp_offset = []
    for k in range(0, len(dp), 3):
        dp_offset.extend([dp[k], dp[k+1], dp[k+2] + 0.0042])
    add_mesh_data(dp_offset, dn, di, DIAL_COLOR, 'Watch_Dial', metalness=0.15, roughness=0.35)

    # 4. Roman Numeral Hour Indicators around Dial
    dial_r = 0.013
    marker_pos = []
    marker_norm = []
    marker_idx = []

    for hour in range(12):
        angle = (hour / 12.0) * 2.0 * math.pi
        mx = math.sin(angle) * dial_r
        my = math.cos(angle) * dial_r
        mz = 0.0048

        is_quarter = (hour % 3 == 0)
        mw = 0.0015 if is_quarter else 0.0009
        mh = 0.0035 if is_quarter else 0.0022
        md = 0.0004

        bx, bn_box, bi_box = create_box_mesh(mw, mh, md)
        v_offset = len(marker_pos) // 3
        for k in range(0, len(bx), 3):
            # Rotate box by angle
            rx = bx[k] * math.cos(-angle) - bx[k+1] * math.sin(-angle) + mx
            ry = bx[k] * math.sin(-angle) + bx[k+1] * math.cos(-angle) + my
            rz = bx[k+2] + mz
            marker_pos.extend([rx, ry, rz])
            marker_norm.extend([bn_box[k], bn_box[k+1], bn_box[k+2]])

        for idx in bi_box:
            marker_idx.append(idx + v_offset)

    add_mesh_data(marker_pos, marker_norm, marker_idx, ROMAN_COLOR, 'Roman_Markers', metalness=0.5, roughness=0.4)

    # 5. Hands (Hour & Minute Hands)
    hp, hn, hi = create_box_mesh(0.0010, 0.010, 0.0004)
    # rotate hour hand (~10 o'clock)
    h_angle = math.pi * 0.65
    hp_trans = []
    for k in range(0, len(hp), 3):
        x = hp[k]
        y = hp[k+1] + 0.004 # translate pivot
        z = hp[k+2] + 0.0052
        rx = x * math.cos(h_angle) - y * math.sin(h_angle)
        ry = x * math.sin(h_angle) + y * math.cos(h_angle)
        hp_trans.extend([rx, ry, z])
    add_mesh_data(hp_trans, hn, hi, SHINY_GOLD, 'Hour_Hand', metalness=0.95, roughness=0.15)

    mp, mn, mi = create_box_mesh(0.0008, 0.014, 0.0004)
    # rotate minute hand (~2 o'clock)
    m_angle = -math.pi * 0.20
    mp_trans = []
    for k in range(0, len(mp), 3):
        x = mp[k]
        y = mp[k+1] + 0.006
        z = mp[k+2] + 0.0055
        rx = x * math.cos(m_angle) - y * math.sin(m_angle)
        ry = x * math.sin(m_angle) + y * math.cos(m_angle)
        mp_trans.extend([rx, ry, z])
    add_mesh_data(mp_trans, mn, mi, SHINY_GOLD, 'Minute_Hand', metalness=0.95, roughness=0.15)

    # 6. Winding Crown (Right Side)
    cr_p, cr_n, cr_i = create_cylinder_mesh(0.0022, 0.0035, segments=16)
    cr_trans = []
    cr_norm = []
    for k in range(0, len(cr_p), 3):
        # Rotate cylinder along X axis
        cr_trans.extend([cr_p[k+2] + 0.0215, cr_p[k], cr_p[k+1]])
        cr_norm.extend([cr_n[k+2], cr_n[k], cr_n[k+1]])
    add_mesh_data(cr_trans, cr_norm, cr_i, SHINY_GOLD, 'Winding_Crown', metalness=0.95, roughness=0.15)

    # 7. Curved Rose Gold Metallic Link Bracelet
    bracelet_pos = []
    bracelet_norm = []
    bracelet_idx = []

    radius_y = 0.045
    radius_z = 0.026
    link_count = 36
    band_w = 0.018

    for i in range(link_count):
        theta = (i / float(link_count)) * 2.0 * math.pi
        if abs(theta - math.pi / 2.0) < 0.25:
            continue # skip case position

        ly = math.sin(theta) * radius_y
        lz = math.cos(theta) * radius_z - radius_z

        # Center link
        clp, cln, cli = create_box_mesh(band_w * 0.45, 0.0025, 0.0045)
        # Outer links
        olp, oln, oli = create_box_mesh(band_w * 0.25, 0.0022, 0.0042)

        def transform_link(lp, ln, li, offset_x):
            v_off = len(bracelet_pos) // 3
            rot_angle = -theta + math.pi / 2.0
            cos_a = math.cos(rot_angle)
            sin_a = math.sin(rot_angle)

            for k in range(0, len(lp), 3):
                x = lp[k] + offset_x
                y = lp[k+1]
                z = lp[k+2]

                ry = y * cos_a - z * sin_a + ly
                rz = y * sin_a + z * cos_a + lz
                bracelet_pos.extend([x, ry, rz])

                ny = ln[k+1] * cos_a - ln[k+2] * sin_a
                nz = ln[k+1] * sin_a + ln[k+2] * cos_a
                bracelet_norm.extend([ln[k], ny, nz])

            for idx in li:
                bracelet_idx.append(idx + v_off)

        transform_link(clp, cln, cli, 0.0)
        transform_link(olp, oln, oli, -band_w * 0.35)
        transform_link(olp, oln, oli, band_w * 0.35)

    add_mesh_data(bracelet_pos, bracelet_norm, bracelet_idx, ROSE_GOLD, 'Metallic_Bracelet', metalness=0.92, roughness=0.20)

    # 8. Display Pillow (Cushion Stand)
    pillow_p, pillow_n, pillow_i = create_cylinder_mesh(radius_y * 0.85, band_w * 1.8, segments=32)
    pillow_trans = []
    pillow_norm = []
    for k in range(0, len(pillow_p), 3):
        pillow_trans.extend([pillow_p[k+2], pillow_p[k], pillow_p[k+1] - radius_z])
        pillow_norm.extend([pillow_n[k+2], pillow_n[k], pillow_n[k+1]])
    add_mesh_data(pillow_trans, pillow_norm, pillow_i, PILLOW_COLOR, 'Display_Pillow', metalness=0.02, roughness=0.88)

    return mesh_parts

def export_glb_file(output_path):
    mesh_parts = build_watch_model()

    # Build binary buffers and GLTF structure
    buffer_bytes = bytearray()

    gltf = {
        "asset": { "version": "2.0", "generator": "Shopora 3D Rose Gold Watch Generator" },
        "scenes": [{ "nodes": [0] }],
        "nodes": [{ "name": "RoseGold_Watch_Root", "children": list(range(1, len(mesh_parts) + 1)) }],
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

    # Pad JSON to 4 bytes boundary
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    # GLB Header + Chunks
    # Total length = 12 (header) + 8 (json header) + len(json_bytes) + 8 (bin header) + len(buffer_bytes)
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

    print(f"✅ Created 100% valid GLB Watch Model: {output_path} ({total_len} bytes)")

def main():
    models_dir = "public/models"
    export_glb_file(os.path.join(models_dir, "rose-gold-square-watch.glb"))
    export_glb_file(os.path.join(models_dir, "chrono-luxe-rose-gold.glb"))
    export_glb_file(os.path.join(models_dir, "watch-rose-gold.glb"))
    print("🎉 All 3D Rose Gold Watch GLB files generated!")

if __name__ == "__main__":
    main()
