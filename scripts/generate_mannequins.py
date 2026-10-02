#!/usr/bin/env python3
import json
import struct
import math
import os

def create_smooth_sphere(cx, cy, cz, rx, ry, rz, stacks=20, slices=24):
    vertices = []
    normals = []
    indices = []
    
    for i in range(stacks + 1):
        v = i / stacks
        lat = math.pi * (v - 0.5)
        sin_lat = math.sin(lat)
        cos_lat = math.cos(lat)
        
        for j in range(slices + 1):
            u = j / slices
            lon = 2 * math.pi * u
            sin_lon = math.sin(lon)
            cos_lon = math.cos(lon)
            
            nx = cos_lat * cos_lon
            ny = sin_lat
            nz = cos_lat * sin_lon
            
            x = cx + rx * nx
            y = cy + ry * ny
            z = cz + rz * nz
            
            # Normal normalized
            len_n = math.sqrt((nx/rx)**2 + (ny/ry)**2 + (nz/rz)**2) or 1.0
            normals.append((nx / (rx * len_n), ny / (ry * len_n), nz / (rz * len_n)))
            vertices.append((x, y, z))
            
    for i in range(stacks):
        for j in range(slices):
            first = i * (slices + 1) + j
            second = first + slices + 1
            
            indices.append(first)
            indices.append(second)
            indices.append(first + 1)
            
            indices.append(second)
            indices.append(second + 1)
            indices.append(first + 1)
            
    return vertices, normals, indices

def create_smooth_capsule(x0, y0, z0, x1, y1, z1, radius, num_segs=16):
    # Capsule along segment (x0,y0,z0) -> (x1,y1,z1)
    vertices = []
    normals = []
    indices = []
    
    dx, dy, dz = x1 - x0, y1 - y0, z1 - z0
    length = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
    ux, uy, uz = dx/length, dy/length, dz/length
    
    # Perpendicular vectors for cylinder orientation
    if abs(ux) < 0.9:
        px, py, pz = 1.0, 0.0, 0.0
    else:
        px, py, pz = 0.0, 1.0, 0.0
        
    # Gram-Schmidt
    dot = px*ux + py*uy + pz*uz
    vx, vy, vz = px - dot*ux, py - dot*uy, pz - dot*uz
    vlen = math.sqrt(vx*vx + vy*vy + vz*vz)
    vx, vy, vz = vx/vlen, vy/vlen, vz/vlen
    
    wx, wy, wz = uy*vz - uz*vy, uz*vx - ux*vz, ux*vy - uy*vx
    
    stacks = 12
    for i in range(stacks + 1):
        t = i / stacks
        # Linear position along segment
        cx = x0 + t * dx
        cy = y0 + t * dy
        cz = z0 + t * dz
        
        for j in range(num_segs + 1):
            angle = 2 * math.pi * j / num_segs
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            
            nx = cos_a * vx + sin_a * wx
            ny = cos_a * vy + sin_a * wy
            nz = cos_a * vz + sin_a * wz
            
            x = cx + radius * nx
            y = cy + radius * ny
            z = cz + radius * nz
            
            vertices.append((x, y, z))
            normals.append((nx, ny, nz))
            
    for i in range(stacks):
        for j in range(num_segs):
            first = i * (num_segs + 1) + j
            second = first + num_segs + 1
            
            indices.append(first)
            indices.append(second)
            indices.append(first + 1)
            
            indices.append(second)
            indices.append(second + 1)
            indices.append(first + 1)
            
    return vertices, normals, indices

def merge_geometries(geom_list):
    all_verts = []
    all_norms = []
    all_indices = []
    
    for v_list, n_list, i_list in geom_list:
        offset = len(all_verts)
        all_verts.extend(v_list)
        all_norms.extend(n_list)
        for idx in i_list:
            all_indices.append(idx + offset)
            
    return all_verts, all_norms, all_indices

def build_mannequin_mesh(category):
    geoms = []
    
    if category == 'men':
        # Male Mannequin Proportions (Height ~1.75m, broader shoulders 0.44m, narrower hips 0.32m)
        # Head (Smooth faceless mannequin head)
        geoms.append(create_smooth_sphere(0, 0.72, 0, 0.10, 0.13, 0.11))
        # Neck
        geoms.append(create_smooth_capsule(0, 0.55, 0, 0, 0.62, 0, 0.055))
        # Torso / Chest (tapered male chest)
        geoms.append(create_smooth_sphere(0, 0.38, 0, 0.22, 0.22, 0.13))
        # Shoulders
        geoms.append(create_smooth_capsule(-0.21, 0.48, 0, 0.21, 0.48, 0, 0.07))
        # Waist
        geoms.append(create_smooth_sphere(0, 0.18, 0, 0.17, 0.14, 0.11))
        # Pelvis / Hips
        geoms.append(create_smooth_sphere(0, 0.02, 0, 0.18, 0.12, 0.12))
        
        # Arms (Standing stance, arms slightly away)
        # Left Upper Arm
        geoms.append(create_smooth_capsule(-0.21, 0.46, 0, -0.25, 0.15, 0.02, 0.05))
        # Left Forearm
        geoms.append(create_smooth_capsule(-0.25, 0.15, 0.02, -0.27, -0.12, 0.05, 0.042))
        # Right Upper Arm
        geoms.append(create_smooth_capsule(0.21, 0.46, 0, 0.25, 0.15, 0.02, 0.05))
        # Right Forearm
        geoms.append(create_smooth_capsule(0.25, 0.15, 0.02, 0.27, -0.12, 0.05, 0.042))
        
        # Legs
        # Left Thigh
        geoms.append(create_smooth_capsule(-0.11, 0.0, 0, -0.12, -0.38, 0, 0.075))
        # Left Calf
        geoms.append(create_smooth_capsule(-0.12, -0.38, 0, -0.12, -0.78, 0, 0.055))
        # Right Thigh
        geoms.append(create_smooth_capsule(0.11, 0.0, 0, 0.12, -0.38, 0, 0.075))
        # Right Calf
        geoms.append(create_smooth_capsule(0.12, -0.38, 0, 0.12, -0.78, 0, 0.055))
        # Feet
        geoms.append(create_smooth_sphere(-0.12, -0.82, 0.04, 0.05, 0.04, 0.09))
        geoms.append(create_smooth_sphere(0.12, -0.82, 0.04, 0.05, 0.04, 0.09))

    elif category == 'women':
        # Female Mannequin Proportions (Height ~1.72m, narrower shoulders 0.36m, bust 0.30m, waist 0.22m, hips 0.36m)
        # Head
        geoms.append(create_smooth_sphere(0, 0.72, 0, 0.095, 0.125, 0.105))
        # Neck
        geoms.append(create_smooth_capsule(0, 0.56, 0, 0, 0.62, 0, 0.045))
        # Bust / Upper Torso
        geoms.append(create_smooth_sphere(0, 0.40, 0.01, 0.18, 0.16, 0.13))
        # Shoulders
        geoms.append(create_smooth_capsule(-0.17, 0.48, 0, 0.17, 0.48, 0, 0.055))
        # Slender Waist
        geoms.append(create_smooth_sphere(0, 0.21, 0, 0.135, 0.13, 0.10))
        # Wider Feminine Hips
        geoms.append(create_smooth_sphere(0, 0.03, 0, 0.19, 0.14, 0.13))
        
        # Arms
        geoms.append(create_smooth_capsule(-0.17, 0.46, 0, -0.21, 0.16, 0.02, 0.042))
        geoms.append(create_smooth_capsule(-0.21, 0.16, 0.02, -0.23, -0.10, 0.04, 0.036))
        geoms.append(create_smooth_capsule(0.17, 0.46, 0, 0.21, 0.16, 0.02, 0.042))
        geoms.append(create_smooth_capsule(0.21, 0.16, 0.02, 0.23, -0.10, 0.04, 0.036))
        
        # Legs
        geoms.append(create_smooth_capsule(-0.105, 0.01, 0, -0.115, -0.38, 0, 0.068))
        geoms.append(create_smooth_capsule(-0.115, -0.38, 0, -0.115, -0.78, 0, 0.048))
        geoms.append(create_smooth_capsule(0.105, 0.01, 0, 0.115, -0.38, 0, 0.068))
        geoms.append(create_smooth_capsule(0.115, -0.38, 0, 0.115, -0.78, 0, 0.048))
        geoms.append(create_smooth_sphere(-0.115, -0.82, 0.04, 0.045, 0.035, 0.08))
        geoms.append(create_smooth_sphere(0.115, -0.82, 0.04, 0.045, 0.035, 0.08))

    else:
        # Child Mannequin Proportions (Height ~1.15m scaled down, larger head-to-body ratio)
        geoms.append(create_smooth_sphere(0, 0.52, 0, 0.11, 0.13, 0.11)) # Larger head ratio
        geoms.append(create_smooth_capsule(0, 0.38, 0, 0, 0.43, 0, 0.045))
        # Torso
        geoms.append(create_smooth_sphere(0, 0.22, 0, 0.15, 0.16, 0.10))
        geoms.append(create_smooth_capsule(-0.14, 0.33, 0, 0.14, 0.33, 0, 0.048))
        geoms.append(create_smooth_sphere(0, 0.02, 0, 0.135, 0.10, 0.10))
        
        # Arms
        geoms.append(create_smooth_capsule(-0.14, 0.32, 0, -0.17, 0.10, 0.01, 0.036))
        geoms.append(create_smooth_capsule(-0.17, 0.10, 0.01, -0.18, -0.10, 0.02, 0.030))
        geoms.append(create_smooth_capsule(0.14, 0.32, 0, 0.17, 0.10, 0.01, 0.036))
        geoms.append(create_smooth_capsule(0.17, 0.10, 0.01, 0.18, -0.10, 0.02, 0.030))
        
        # Legs
        geoms.append(create_smooth_capsule(-0.08, -0.02, 0, -0.09, -0.30, 0, 0.052))
        geoms.append(create_smooth_capsule(-0.09, -0.30, 0, -0.09, -0.58, 0, 0.040))
        geoms.append(create_smooth_capsule(0.08, -0.02, 0, 0.09, -0.30, 0, 0.052))
        geoms.append(create_smooth_capsule(0.09, -0.30, 0, 0.09, -0.58, 0, 0.040))
        geoms.append(create_smooth_sphere(-0.09, -0.61, 0.03, 0.04, 0.03, 0.065))
        geoms.append(create_smooth_sphere(0.09, -0.61, 0.03, 0.04, 0.03, 0.065))
        
    return merge_geometries(geoms)

def export_glb(filepath, vertices, normals, indices):
    # Pack binary data
    # Positions (VEC3 float32)
    pos_bytes = bytearray()
    min_pos = [float('inf')]*3
    max_pos = [float('-inf')]*3
    for v in vertices:
        pos_bytes.extend(struct.pack('<fff', v[0], v[1], v[2]))
        for c in range(3):
            if v[c] < min_pos[c]: min_pos[c] = v[c]
            if v[c] > max_pos[c]: max_pos[c] = v[c]
            
    # Normals (VEC3 float32)
    norm_bytes = bytearray()
    for n in normals:
        norm_bytes.extend(struct.pack('<fff', n[0], n[1], n[2]))
        
    # Indices (SCALAR uint16)
    idx_bytes = bytearray()
    min_idx = min(indices)
    max_idx = max(indices)
    for idx in indices:
        idx_bytes.extend(struct.pack('<H', idx))
        
    # Buffer layout: [Positions][Normals][Indices]
    offset_pos = 0
    len_pos = len(pos_bytes)
    
    offset_norm = len_pos
    len_norm = len(norm_bytes)
    
    # Pad to 4 bytes boundary for indices offset
    padding_norm = (4 - (len_norm % 4)) % 4
    norm_bytes.extend(b'\x00' * padding_norm)
    len_norm_padded = len(norm_bytes)
    
    offset_idx = offset_norm + len_norm_padded
    len_idx = len(idx_bytes)
    
    padding_idx = (4 - (len_idx % 4)) % 4
    idx_bytes.extend(b'\x00' * padding_idx)
    len_idx_padded = len(idx_bytes)
    
    buffer_bytes = pos_bytes + norm_bytes + idx_bytes
    total_buffer_length = len(buffer_bytes)
    
    # Build glTF JSON structure
    gltf_doc = {
        "asset": {"version": "2.0", "generator": "Shopora Mannequin GLB Exporter"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "MannequinBody"}],
        "meshes": [{
            "name": "MannequinMesh",
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1
                },
                "indices": 2,
                "material": 0
            }]
        }],
        "materials": [{
            "name": "StoreMannequinMaterial",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.91, 0.835, 0.77, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.6
            }
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126, # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "min": min_pos,
                "max": max_pos
            },
            {
                "bufferView": 1,
                "componentType": 5126, # FLOAT
                "count": len(normals),
                "type": "VEC3"
            },
            {
                "bufferView": 2,
                "componentType": 5123, # UNSIGNED_SHORT
                "count": len(indices),
                "type": "SCALAR",
                "min": [min_idx],
                "max": [max_idx]
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": offset_pos,
                "byteLength": len_pos,
                "target": 34962 # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": offset_norm,
                "byteLength": len(norm_bytes) - padding_norm,
                "target": 34962 # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": offset_idx,
                "byteLength": len_idx,
                "target": 34963 # ELEMENT_ARRAY_BUFFER
            }
        ],
        "buffers": [{
            "byteLength": total_buffer_length
        }]
    }
    
    json_str = json.dumps(gltf_doc, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    json_padding = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_padding
    
    # Write binary GLB
    # Header: magic (4B), version (4B), length (4B)
    # Chunk 0: length (4B), type (4B), data
    # Chunk 1: length (4B), type (4B), data
    chunk0_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # JSON
    chunk1_header = struct.pack('<II', len(buffer_bytes), 0x00415441) # BIN\0
    
    total_glb_length = 12 + len(chunk0_header) + len(json_bytes) + len(chunk1_header) + len(buffer_bytes)
    header = struct.pack('<III', 0x46546C67, 2, total_glb_length)
    
    with open(filepath, 'wb') as f:
        f.write(header)
        f.write(chunk0_header)
        f.write(json_bytes)
        f.write(chunk1_header)
        f.write(buffer_bytes)

def main():
    os.makedirs('public/models', exist_ok=True)
    for cat in ['men', 'women', 'children']:
        verts, norms, idxs = build_mannequin_mesh(cat)
        path = f'public/models/mannequin-{cat}.glb'
        export_glb(path, verts, norms, idxs)
        print(f'Generated smooth store mannequin GLB asset: {path} ({len(verts)} vertices, {len(idxs)} indices)')

if __name__ == '__main__':
    main()
