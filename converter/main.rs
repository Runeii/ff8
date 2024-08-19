use byteorder::{LittleEndian, ReadBytesExt};
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

    Model {
        header,
        bones,
        vertices,
        faces,
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

fn find_all_offsets(data: &[u8], pattern: u32) -> Vec<usize> {
    let pattern_bytes: [u8; 4] = pattern.to_le_bytes(); // Convert the target value to a little-endian byte array
    let mut offsets = Vec::new();

    for i in 0..(data.len() - 3) {
        // Loop through the data, ensuring we don't go out of bounds
        if &data[i..i + 4] == pattern_bytes {
            offsets.push(i); // Add the offset to the results vector
        }
    }

    offsets
}
fn create_obj<P: AsRef<Path>>(model: Model, output_path: P) -> io::Result<()> {
    let mut file = File::create(output_path)?;

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
    let data = include_bytes!("d001.mch");

    let header = read_header(data);
    let model = load_model(data, header.model_data_offset);
    create_obj(model, "output.obj")?;
    Ok(())
}
