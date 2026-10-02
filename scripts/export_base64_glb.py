import json
import base64
import math
import os
import struct

def create_cylinder_mesh(radius_top, radius_bottom, height, segments=16):
    positions = []
    normals = []
    indices = []

    # Generate cylinder vertices and normals
    for i in range(segments + 1):
        theta = (i / segments) * 2.0 * math.pi
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        # Top vertex
        positions.extend([radius_top * cos_t, height / 2.0, radius_top * sin_t])
        normals.extend([cos_t, 0.0, sin_t])

        # Bottom vertex
        positions.extend([radius_bottom * cos_t, -height / 2.0, radius_bottom * sin_t])
        normals.extend([cos_t, 0.0, sin_t])

    for i in range(segments):
        top1 = i * 2
        bot1 = top1 + 1
        top2 = (i + 1) * 2
        bot2 = top2 + 1

        indices.extend([top1, bot1, top2])
        indices.extend([top2, bot1, bot2])

    return positions, normals, indices

def create_sphere_mesh(radius, width_segments=16, height_segments=12):
    positions = []
    normals = []
    indices = []

    for y in range(height_segments + 1):
        v = y / height_segments
        phi = v * math.pi

        for x in range(width_segments + 1):
            u = x / width_segments
            theta = u * 2.0 * math.pi

            px = -radius * math.cos(theta) * math.sin(phi)
            py = radius * math.cos(phi)
            pz = radius * math.sin(theta) * math.sin(phi)

            positions.extend([px, py, pz])
            
            length = math.sqrt(px*px + py*py + pz*pz) or 1.0
            normals.extend([px/length, py/length, pz/length])

    for y in range(height_segments):
        for x in range(width_segments):
            first = (y * (width_segments + 1)) + x
            second = first + width_segments + 1

            indices.extend([first, second, first + 1])
            indices.extend([second, second + 1, first + 1])

    return positions, normals, indices

def build_mannequin(category):
    if category == 'men':
        h_total = 1.80
        w_shoulder = 0.46
        w_bust = 0.38
        w_waist = 0.30
        w_hip = 0.34
        head_r = 0.12
    elif category == 'women':
        h_total = 1.72
        w_shoulder = 0.38
        w_bust = 0.36
        w_waist = 0.26
        w_hip = 0.38
        head_r = 0.11
    else: # children
        h_total = 1.25
        w_shoulder = 0.30
        w_bust = 0.26
        w_waist = 0.24
        w_hip = 0.26
        head_r = 0.13

    all_positions = []
    all_normals = []
    all_indices = []

    def add_mesh_part(pos_list, norm_list, idx_list, offset_pos):
        v_offset = len(all_positions) // 3
        ox, oy, oz = offset_pos
        for i in range(0, len(pos_list), 3):
            all_positions.extend([pos_list[i] + ox, pos_list[i+1] + oy, pos_list[i+2] + oz])
            all_normals.extend([norm_list[i], norm_list[i+1], norm_list[i+2]])
        for idx in idx_list:
            all_indices.append(idx + v_offset)

    # 1. Torso Upper
    p, n, i = create_cylinder_mesh(w_shoulder/2, w_bust/2, h_total * 0.20)
    add_mesh_part(p, n, i, (0, h_total * 0.15, 0))

    # 2. Torso Mid / Waist
    p, n, i = create_cylinder_mesh(w_bust/2, w_waist/2, h_total * 0.15)
    add_mesh_part(p, n, i, (0, h_total * 0.0, 0))

    # 3. Hips / Pelvis
    p, n, i = create_cylinder_mesh(w_waist/2, w_hip/2, h_total * 0.15)
    add_mesh_part(p, n, i, (0, -h_total * 0.12, 0))

    # 4. Faceless Egg Head
    p, n, i = create_sphere_mesh(head_r)
    add_mesh_part(p, n, i, (0, h_total * 0.38, 0))

    # 5. Neck
    p, n, i = create_cylinder_mesh(0.06, 0.07, h_total * 0.08)
    add_mesh_part(p, n, i, (0, h_total * 0.26, 0))

    # 6. Legs (Left & Right)
    p, n, i = create_cylinder_mesh(w_hip * 0.22, w_hip * 0.15, h_total * 0.45)
    add_mesh_part(p, n, i, (-w_hip * 0.25, -h_total * 0.40, 0))
    add_mesh_part(p, n, i, (w_hip * 0.25, -h_total * 0.40, 0))

    # 7. Lower Legs (Left & Right)
    p, n, i = create_cylinder_mesh(w_hip * 0.15, w_hip * 0.10, h_total * 0.40)
    add_mesh_part(p, n, i, (-w_hip * 0.25, -h_total * 0.75, 0))
    add_mesh_part(p, n, i, (w_hip * 0.25, -h_total * 0.75, 0))

    # 8. Arms (Left & Right)
    p, n, i = create_cylinder_mesh(0.05, 0.04, h_total * 0.35)
    add_mesh_part(p, n, i, (-w_shoulder * 0.55, h_total * 0.08, 0))
    add_mesh_part(p, n, i, (w_shoulder * 0.55, h_total * 0.08, 0))

    # 9. Forearms (Left & Right)
    p, n, i = create_cylinder_mesh(0.04, 0.03, h_total * 0.30)
    add_mesh_part(p, n, i, (-w_shoulder * 0.55, -h_total * 0.22, 0))
    add_mesh_part(p, n, i, (w_shoulder * 0.55, -h_total * 0.22, 0))

    min_x = min(all_positions[0::3])
    max_x = max(all_positions[0::3])
    min_y = min(all_positions[1::3])
    max_y = max(all_positions[1::3])
    min_z = min(all_positions[2::3])
    max_z = max(all_positions[2::3])

    pos_bytes = bytearray()
    for val in all_positions:
        pos_bytes.extend(struct.pack('<f', val))

    norm_bytes = bytearray()
    for val in all_normals:
        norm_bytes.extend(struct.pack('<f', val))

    idx_bytes = bytearray()
    for val in all_indices:
        idx_bytes.extend(struct.pack('<H', val)) # uint16

    bin_data = pos_bytes + norm_bytes + idx_bytes
    b64_str = base64.b64encode(bin_data).decode('utf-8')
    data_uri = f"data:application/octet-stream;base64,{b64_str}"

    pos_offset = 0
    pos_len = len(pos_bytes)

    norm_offset = pos_len
    norm_len = len(norm_bytes)

    idx_offset = norm_offset + norm_len
    idx_len = len(idx_bytes)

    gltf_doc = {
        "asset": { "version": "2.0", "generator": "Shopora Python GLTF Generator" },
        "scenes": [{ "nodes": [0] }],
        "nodes": [{ "mesh": 0, "name": f"Mannequin_{category}" }],
        "meshes": [{
            "name": f"Mesh_{category}",
            "primitives": [{
                "attributes": { "POSITION": 0, "NORMAL": 1 },
                "indices": 2,
                "material": 0
            }]
        }],
        "materials": [{
            "name": "MannequinMat",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.918, 0.843, 0.765, 1.0], # #ead7c3
                "roughnessFactor": 0.55,
                "metallicFactor": 0.02
            }
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126, # FLOAT
                "count": len(all_positions) // 3,
                "type": "VEC3",
                "min": [min_x, min_y, min_z],
                "max": [max_x, max_y, max_z]
            },
            {
                "bufferView": 1,
                "componentType": 5126, # FLOAT
                "count": len(all_normals) // 3,
                "type": "VEC3"
            },
            {
                "bufferView": 2,
                "componentType": 5123, # UNSIGNED_SHORT
                "count": len(all_indices),
                "type": "SCALAR",
                "min": [0],
                "max": [max(all_indices)]
            }
        ],
        "bufferViews": [
            { "buffer": 0, "byteOffset": pos_offset, "byteLength": pos_len, "target": 34962 },
            { "buffer": 0, "byteOffset": norm_offset, "byteLength": norm_len, "target": 34962 },
            { "buffer": 0, "byteOffset": idx_offset, "byteLength": idx_len, "target": 34963 }
        ],
        "buffers": [{ "byteLength": len(bin_data), "uri": data_uri }]
    }

    return json.dumps(gltf_doc)

def main():
    models_dir = "public/models"
    os.makedirs(models_dir, exist_ok=True)

    files = [
        ('men', 'mannequin-male.glb'),
        ('men', 'mannequin-men.glb'),
        ('women', 'mannequin-female.glb'),
        ('women', 'mannequin-women.glb'),
        ('children', 'mannequin-child.glb'),
        ('children', 'mannequin-children.glb')
    ]

    for cat, filename in files:
        json_content = build_mannequin(cat)
        path = os.path.join(models_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(json_content)
        print(f"✅ Generated standard base64 glTF mannequin for {cat} -> {path} ({len(json_content)} bytes)")

if __name__ == "__main__":
    main()
