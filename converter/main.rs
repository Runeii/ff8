use crate::json::extras::Void;
use base64;
use byteorder::{LittleEndian, ReadBytesExt};
use gltf::json::{self, validation::Checked, Index, Root};
use serde_json;
use std::collections::BTreeMap;
use std::convert::TryInto;
use std::fs::File;
use std::io::{self, Cursor, Write};
use std::path::Path;
#[repr(C)]
#[derive(Debug, Clone)]
pub struct Header {
    pub texture_offsets: Vec<u32>, // Offsets to texture data
    pub model_data_offset: u32,    // Offset to model data
}

#[derive(Debug)]
pub struct Model {
    pub header: ModelHeader,
    pub faces: Vec<Face>,
    pub vertices: Vec<Vertex>,
    pub bones: Vec<Bone>,
    pub texture_animations: Vec<TextureAnimation>,
    pub skins: Vec<Skin>,
    pub animation_data: AnimationData,
}

#[derive(Debug)]
pub struct ModelHeader {
    pub num_skeleton_bones: u32,
    pub num_vertices: u32,
    pub num_texture_animations: u32,
    pub num_faces: u32,
    pub num_unknown_data: u32,
    pub num_skin_objects: u32,
    pub triangle_count: u16,
    pub quad_count: u16,
    pub offset_bones: u32,
    pub offset_vertices: u32,
    pub offset_texture_animations: u32,
    pub offset_faces: u32,
    pub offset_unknown_data: u32,
    pub offset_skin_objects: u32,
    pub offset_animation_data: u32,
    pub unknown: u32,
}

#[derive(Debug)]
pub struct Bone {
    pub parent_bone: i16,
    pub unknown1: i16,
    pub unknown2: u32,
    pub bone_length: i16,
    pub unknown_data: [u32; 15],
}

#[derive(Debug)]
pub struct Vertex {
    pub x: i16,
    pub y: i16,
    pub z: i16,
    pub unknown_short: i16,
    pub unknown_data: [u32; 4],
}

#[derive(Debug)]
pub struct Face {
    pub opcode: u32,
    pub unk1: [u8; 4],
    pub unknown: i16,
    pub unk2: [u8; 2],
    pub vertices: [u16; 4],
    pub vertices1: [u16; 4],
    pub vertex_colours: [u32; 4],
    pub texture_data: [u16; 4], // TextureMap: u16 where first byte = u, second byte = v
    pub padding1: u16,
    pub texture_index: u16,
    pub padding2: [u32; 2],
}

#[derive(Debug)]
pub struct Skin {
    pub first_vertex_index: u16,
    pub vertex_count: u16,
    pub bone_id: u16,
    pub unknown: u16,
}

#[derive(Debug)]
pub struct UVPair {
    pub u: u8,
    pub v: u8,
}

#[derive(Debug)]
pub struct TextureAnimation {
    pub unknown1: u8,
    pub total_textures: u8,
    pub unknown2: u8,
    pub u_size: u8,
    pub v_size: u8,
    pub replacement_section_count: u8,
    pub original_area_coords: UVPair,
    pub unknown3: [u8; 2],
    pub replacement_coords: Vec<UVPair>,
}

#[derive(Debug)]
pub struct Rotation {
    pub x: i16,
    pub y: i16,
    pub z: i16,
}

#[derive(Debug)]
pub struct AnimationFrame {
    pub coordinates_shift: [i16; 3], // YXZ order
    pub rotations: Vec<Rotation>,    // ZXY order, applied as YXZ
}

#[derive(Debug)]
pub struct Animation {
    pub frame_count: u16,
    pub bone_count: u16,
    pub frames: Vec<AnimationFrame>,
}

#[derive(Debug)]
pub struct AnimationData {
    pub animation_count: u16,
    pub animations: Vec<Animation>,
}

fn read_header(data: &[u8]) -> Header {
    let mut cursor = Cursor::new(data);
    let mut texture_offsets = Vec::new();

    // Reading DWORDs (4 bytes) until we hit 0xFFFFFFFF
    while let Ok(dword) = cursor.read_u32::<LittleEndian>() {
        if dword == 0xFFFFFFFF {
            break;
        }
        texture_offsets.push(dword);
    }

    // After the texture offsets, read the model data offset
    let model_data_offset = cursor.read_u32::<LittleEndian>().unwrap();

    Header {
        texture_offsets,
        model_data_offset,
    }
}

fn load_model(data: &[u8], offset: u32) -> Model {
    let base_offset = offset as usize;

    let num_skeleton_bones =
        u32::from_le_bytes(data[base_offset..base_offset + 4].try_into().unwrap());
    let num_vertices =
        u32::from_le_bytes(data[base_offset + 4..base_offset + 8].try_into().unwrap());
    let num_texture_animations =
        u32::from_le_bytes(data[base_offset + 8..base_offset + 12].try_into().unwrap());
    let num_faces =
        u32::from_le_bytes(data[base_offset + 12..base_offset + 16].try_into().unwrap());
    let num_unknown_data =
        u32::from_le_bytes(data[base_offset + 16..base_offset + 20].try_into().unwrap());
    let num_skin_objects =
        u32::from_le_bytes(data[base_offset + 20..base_offset + 24].try_into().unwrap());

    let _unknown_18 =
        u32::from_le_bytes(data[base_offset + 24..base_offset + 28].try_into().unwrap());

    let triangle_count =
        u16::from_le_bytes(data[base_offset + 28..base_offset + 30].try_into().unwrap());
    let quad_count =
        u16::from_le_bytes(data[base_offset + 30..base_offset + 32].try_into().unwrap());

    let offset_bones =
        u32::from_le_bytes(data[base_offset + 32..base_offset + 36].try_into().unwrap());
    let offset_vertices =
        u32::from_le_bytes(data[base_offset + 36..base_offset + 40].try_into().unwrap());
    let offset_texture_animations =
        u32::from_le_bytes(data[base_offset + 40..base_offset + 44].try_into().unwrap());
    let offset_faces =
        u32::from_le_bytes(data[base_offset + 44..base_offset + 48].try_into().unwrap());
    let offset_unknown_data =
        u32::from_le_bytes(data[base_offset + 48..base_offset + 52].try_into().unwrap());
    let offset_skin_objects =
        u32::from_le_bytes(data[base_offset + 52..base_offset + 56].try_into().unwrap());
    let offset_animation_data =
        u32::from_le_bytes(data[base_offset + 56..base_offset + 60].try_into().unwrap());

    let unknown = u32::from_le_bytes(data[base_offset + 60..base_offset + 64].try_into().unwrap());

    let header = ModelHeader {
        num_skeleton_bones,
        num_vertices,
        num_texture_animations,
        num_faces,
        num_unknown_data,
        num_skin_objects,
        triangle_count,
        quad_count,
        offset_bones,
        offset_vertices,
        offset_texture_animations,
        offset_faces,
        offset_unknown_data,
        offset_skin_objects,
        offset_animation_data,
        unknown,
    };

    let bones = load_bones(data, offset + offset_bones, num_skeleton_bones);
    let vertices = load_vertices(data, offset + offset_vertices, num_vertices);
    let faces = load_faces(data, offset + offset_faces, num_faces);
    let skins = load_skin_data(data, offset + offset_skin_objects, num_skin_objects);
    let texture_animations = load_texture_animation_data(
        data,
        offset + offset_texture_animations,
        num_texture_animations,
    );
    let animation_data = load_animation_data(data, offset + offset_animation_data);

    Model {
        header,
        bones,
        vertices,
        faces,
        texture_animations,
        skins,
        animation_data,
    }
}

fn load_texture_animation_data(data: &[u8], offset: u32, count: u32) -> Vec<TextureAnimation> {
    let mut animations = Vec::with_capacity(count as usize);
    let mut current_offset = offset as usize;

    for _ in 0..count {
        // Read the fixed part of the structure
        let unknown1 = data[current_offset];
        let total_textures = data[current_offset + 1];
        let unknown2 = data[current_offset + 2];
        let u_size = data[current_offset + 3];
        let v_size = data[current_offset + 4];
        let replacement_section_count = data[current_offset + 5];

        let original_area_coords = UVPair {
            u: data[current_offset + 6],
            v: data[current_offset + 7],
        };

        let unknown3 = [data[current_offset + 8], data[current_offset + 9]];

        // Move the offset to the replacement coordinates section
        current_offset += 10;

        // Read the replacement coordinates
        let mut replacement_coords = Vec::with_capacity(replacement_section_count as usize);
        for _ in 0..replacement_section_count {
            let u = data[current_offset];
            let v = data[current_offset + 1];
            replacement_coords.push(UVPair { u, v });
            current_offset += 2;
        }

        // Create a TextureAnimation struct and add it to the vector
        animations.push(TextureAnimation {
            unknown1,
            total_textures,
            unknown2,
            u_size,
            v_size,
            replacement_section_count,
            original_area_coords,
            unknown3,
            replacement_coords,
        });
    }

    animations
}

fn load_animation_data(data: &[u8], offset: u32) -> AnimationData {
    let mut current_offset = offset as usize;

    // Read the number of animations
    let animation_count = u16::from_le_bytes([data[current_offset], data[current_offset + 1]]);
    current_offset += 2;

    let mut animations = Vec::with_capacity(animation_count as usize);

    for _ in 0..animation_count {
        // Read the number of frames and bones for this animation
        let frame_count = u16::from_le_bytes([data[current_offset], data[current_offset + 1]]);
        let bone_count = u16::from_le_bytes([data[current_offset + 2], data[current_offset + 3]]);
        current_offset += 4;

        let mut frames = Vec::with_capacity(frame_count as usize);

        for _ in 0..frame_count {
            // Read the coordinates shift (3 * s16)
            let coordinates_shift = [
                i16::from_le_bytes([data[current_offset], data[current_offset + 1]]), // Y
                i16::from_le_bytes([data[current_offset + 2], data[current_offset + 3]]), // X
                i16::from_le_bytes([data[current_offset + 4], data[current_offset + 5]]), // Z
            ];
            current_offset += 6;

            let mut rotations = Vec::with_capacity(bone_count as usize);

            for _ in 0..bone_count {
                let rots = [
                    data[current_offset],
                    data[current_offset + 1],
                    data[current_offset + 2],
                    data[current_offset + 3],
                ];
                let rotation_x = ((rots[0] as i16) << 2) | (((rots[3] >> 0) & 0b11) as i16) << 10;
                let rotation_y = ((rots[1] as i16) << 2) | (((rots[3] >> 2) & 0b11) as i16) << 10;
                let rotation_z = ((rots[2] as i16) << 2) | (((rots[3] >> 4) & 0b11) as i16) << 10;

                rotations.push(Rotation {
                    x: rotation_x,
                    y: rotation_y,
                    z: rotation_z,
                });

                current_offset += 4;
            }

            frames.push(AnimationFrame {
                coordinates_shift,
                rotations,
            });
        }

        animations.push(Animation {
            frame_count,
            bone_count,
            frames,
        });
    }

    AnimationData {
        animation_count,
        animations,
    }
}

fn load_bones(data: &[u8], offset: u32, count: u32) -> Vec<Bone> {
    let mut bones = Vec::with_capacity(count as usize);
    let mut current_offset = offset as usize;

    for _ in 0..count {
        let parent_bone =
            i16::from_le_bytes(data[current_offset..current_offset + 2].try_into().unwrap());
        let unknown1 = i16::from_le_bytes(
            data[current_offset + 2..current_offset + 4]
                .try_into()
                .unwrap(),
        );
        let unknown2 = u32::from_le_bytes(
            data[current_offset + 4..current_offset + 8]
                .try_into()
                .unwrap(),
        );
        let bone_length = i16::from_le_bytes(
            data[current_offset + 8..current_offset + 10]
                .try_into()
                .unwrap(),
        );

        let mut unknown_data = [0u32; 15];
        for i in 0..15 {
            unknown_data[i] = u32::from_le_bytes(
                data[current_offset + 10 + i * 4..current_offset + 14 + i * 4]
                    .try_into()
                    .unwrap(),
            );
        }

        bones.push(Bone {
            parent_bone,
            unknown1,
            unknown2,
            bone_length,
            unknown_data,
        });

        // Move to the next bone (0x40 bytes per bone)
        current_offset += 0x40;
    }

    bones
}

fn load_vertices(data: &[u8], offset: u32, count: u32) -> Vec<Vertex> {
    let mut vertices = Vec::with_capacity(count as usize);
    let mut current_offset = offset as usize;

    for _ in 0..count {
        let x = i16::from_le_bytes(data[current_offset..current_offset + 2].try_into().unwrap());
        let y = i16::from_le_bytes(
            data[current_offset + 2..current_offset + 4]
                .try_into()
                .unwrap(),
        );
        let z = i16::from_le_bytes(
            data[current_offset + 4..current_offset + 6]
                .try_into()
                .unwrap(),
        );
        let unknown_short = i16::from_le_bytes(
            data[current_offset + 6..current_offset + 8]
                .try_into()
                .unwrap(),
        );

        let mut unknown_data = [0u32; 4];
        for i in 0..4 {
            unknown_data[i] = u32::from_le_bytes(
                data[current_offset + 8 + i * 4..current_offset + 12 + i * 4]
                    .try_into()
                    .unwrap(),
            );
        }

        vertices.push(Vertex {
            x,
            y,
            z,
            unknown_short,
            unknown_data,
        });

        // Move to the next vertex (2 * 8 + 4 * 4 = 24 bytes per vertex)
        current_offset += 24;
    }

    vertices
}

fn load_faces(data: &[u8], offset: u32, count: u32) -> Vec<Face> {
    let mut faces = Vec::with_capacity(count as usize);
    let mut current_offset = offset as usize;

    for _ in 0..count {
        let opcode =
            u32::from_be_bytes(data[current_offset..current_offset + 4].try_into().unwrap());

        let unk1 = data[current_offset + 4..current_offset + 8]
            .try_into()
            .unwrap();

        let unknown = i16::from_le_bytes(
            data[current_offset + 8..current_offset + 10]
                .try_into()
                .unwrap(),
        );
        let unk2 = data[current_offset + 10..current_offset + 12]
            .try_into()
            .unwrap();

        let vertices = [
            u16::from_le_bytes(
                data[current_offset + 12..current_offset + 14]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 14..current_offset + 16]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 16..current_offset + 18]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 18..current_offset + 20]
                    .try_into()
                    .unwrap(),
            ),
        ];

        let vertices1 = [
            u16::from_le_bytes(
                data[current_offset + 20..current_offset + 22]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 22..current_offset + 24]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 24..current_offset + 26]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 26..current_offset + 28]
                    .try_into()
                    .unwrap(),
            ),
        ];

        let vertex_colours = [
            u32::from_le_bytes(
                data[current_offset + 28..current_offset + 32]
                    .try_into()
                    .unwrap(),
            ),
            u32::from_le_bytes(
                data[current_offset + 32..current_offset + 36]
                    .try_into()
                    .unwrap(),
            ),
            u32::from_le_bytes(
                data[current_offset + 36..current_offset + 40]
                    .try_into()
                    .unwrap(),
            ),
            u32::from_le_bytes(
                data[current_offset + 40..current_offset + 44]
                    .try_into()
                    .unwrap(),
            ),
        ];

        let texture_data = [
            u16::from_le_bytes(
                data[current_offset + 44..current_offset + 46]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 46..current_offset + 48]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 48..current_offset + 50]
                    .try_into()
                    .unwrap(),
            ),
            u16::from_le_bytes(
                data[current_offset + 50..current_offset + 52]
                    .try_into()
                    .unwrap(),
            ),
        ];

        let padding1 = u16::from_le_bytes(
            data[current_offset + 52..current_offset + 54]
                .try_into()
                .unwrap(),
        );
        let texture_index = u16::from_le_bytes(
            data[current_offset + 54..current_offset + 56]
                .try_into()
                .unwrap(),
        );

        let padding2 = [
            u32::from_le_bytes(
                data[current_offset + 56..current_offset + 60]
                    .try_into()
                    .unwrap(),
            ),
            u32::from_le_bytes(
                data[current_offset + 60..current_offset + 64]
                    .try_into()
                    .unwrap(),
            ),
        ];

        faces.push(Face {
            opcode,
            unk1,
            unknown,
            unk2,
            vertices,
            vertices1,
            vertex_colours,
            texture_data,
            padding1,
            texture_index,
            padding2,
        });

        current_offset += 64; // Each face is 64 bytes
    }

    faces
}

fn load_skin_data(data: &[u8], offset: u32, count: u32) -> Vec<Skin> {
    let mut skins = Vec::with_capacity(count as usize);

    for i in 0..count {
        let base_offset = (offset as usize) + (i as usize) * 8; // Each skin-object is 8 bytes

        // Read the first vertex index (SHORT)
        let first_vertex_index = u16::from_le_bytes([data[base_offset], data[base_offset + 1]]);

        // Read the number of vertices (SHORT)
        let vertex_count = u16::from_le_bytes([data[base_offset + 2], data[base_offset + 3]]);

        // Read the Bone ID (SHORT)
        let bone_id = u16::from_le_bytes([data[base_offset + 4], data[base_offset + 5]]);

        // Read the unknown field (SHORT)
        let unknown = u16::from_le_bytes([data[base_offset + 6], data[base_offset + 7]]);

        skins.push(Skin {
            first_vertex_index,
            vertex_count,
            bone_id,
            unknown,
        });
    }

    skins
}

fn create_obj<P: AsRef<Path>>(model: Model, output_path: P) -> io::Result<()> {
    let mut file = File::create(output_path)?;

    writeln!(file, "mtllib unused.mtl")?;
    writeln!(file, "g")?;
    // Write the vertices with adjusted scaling and axis reordering
    for vertex in &model.vertices {
        writeln!(
            file,
            "v {} {} {}",
            vertex.x as f32 / 2000.0, // Adjusted scaling factor to 2000.0
            vertex.y as f32 / 2000.0, // Reorder axes to match the C# approach (X, Y, Z)
            vertex.z as f32 / 2000.0  // Use Z as Z-axis
        )?;
    }

    // Write the faces
    for face in &model.faces {
        let is_triangle = face.opcode == 0x07060125;
        if is_triangle {
            writeln!(
                file,
                "f {}/{} {}/{} {}/{}",
                face.vertices[0] + 1,
                face.vertices[0] + 1,
                face.vertices[1] + 1,
                face.vertices[1] + 1,
                face.vertices[2] + 1,
                face.vertices[2] + 1
            )?;
        } else {
            writeln!(
                file,
                "f {}/{} {}/{} {}/{} {}/{}",
                face.vertices[0] + 1,
                face.vertices[0] + 1,
                face.vertices[1] + 1,
                face.vertices[1] + 1,
                face.vertices[2] + 1,
                face.vertices[2] + 1,
                face.vertices[3] + 1,
                face.vertices[3] + 1
            )?;
        }
    }

    Ok(())
}

fn main() -> io::Result<()> {
    let data = include_bytes!("d000.mch");

    let header = read_header(data);
    let model = load_model(data, header.model_data_offset);

    create_obj(model, "output/d000.obj")?;
    Ok(())
}
