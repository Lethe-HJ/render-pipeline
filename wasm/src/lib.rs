use std::alloc::{alloc, dealloc, Layout};
use std::slice;

#[derive(Clone, Copy)]
struct PreparedEdge {
    start: (f64, f64),
    end: (f64, f64),
    min_y: f64,
    max_y: f64,
    inverse_slope: f64,
}

fn prepare_edges(points: &[(f64, f64)], path_ends: &[usize]) -> Option<Vec<PreparedEdge>> {
    let mut edges = Vec::new();
    let mut path_start = 0;

    for &path_end in path_ends {
        if path_end < path_start || path_end > points.len() || path_end - path_start < 3 {
            return None;
        }
        let path = &points[path_start..path_end];
        for index in 0..path.len() {
            let start = path[index];
            let end = path[(index + 1) % path.len()];
            let delta_y = end.1 - start.1;
            edges.push(PreparedEdge {
                start,
                end,
                min_y: start.1.min(end.1),
                max_y: start.1.max(end.1),
                inverse_slope: if delta_y == 0.0 {
                    0.0
                } else {
                    (end.0 - start.0) / delta_y
                },
            });
        }
        path_start = path_end;
    }

    if path_start != points.len() || edges.is_empty() {
        return None;
    }
    Some(edges)
}

#[inline]
fn is_on_segment(edge: PreparedEdge, x: f64, y: f64) -> bool {
    let cross = (x - edge.start.0) * (edge.end.1 - edge.start.1)
        - (y - edge.start.1) * (edge.end.0 - edge.start.0);
    cross == 0.0
        && x >= edge.start.0.min(edge.end.0)
        && x <= edge.start.0.max(edge.end.0)
        && y >= edge.min_y
        && y <= edge.max_y
}

#[inline]
fn contains_point(edges: &[PreparedEdge], x: f64, y: f64) -> bool {
    let mut inside = false;
    for &edge in edges {
        if is_on_segment(edge, x, y) {
            return true;
        }
        if y >= edge.min_y && y < edge.max_y && edge.start.1 != edge.end.1 {
            let intersection_x = edge.start.0 + (y - edge.start.1) * edge.inverse_slope;
            if intersection_x > x {
                inside = !inside;
            }
        }
    }
    inside
}

fn rasterize_paths_into(
    points: &[(f64, f64)],
    path_ends: &[usize],
    start: (f64, f64),
    step: f64,
    columns: u32,
    rows: u32,
    output: &mut [u8],
) -> u32 {
    let Some(sample_count) = (columns as usize).checked_mul(rows as usize) else {
        return 0;
    };
    if output.len() < sample_count {
        return 0;
    }
    let Some(edges) = prepare_edges(points, path_ends) else {
        output[..sample_count].fill(0);
        return 0;
    };
    let mut inside_count = 0_u32;
    let mut grid_y = start.1;

    for row in 0..rows {
        let sample_y = grid_y + step / 2.0;
        let mut grid_x = start.0;
        for column in 0..columns {
            let sample_x = grid_x + step / 2.0;
            let output_index = (row * columns + column) as usize;

            if contains_point(&edges, sample_x, sample_y) {
                output[output_index] = 1;
                inside_count += 1;
            } else {
                output[output_index] = 0;
            }

            grid_x += step;
        }
        grid_y += step;
    }

    inside_count
}

#[no_mangle]
pub extern "C" fn allocate_points(point_count: u32) -> u32 {
    let Some(value_count) = (point_count as usize).checked_mul(2) else {
        return 0;
    };
    let Ok(layout) = Layout::array::<f64>(value_count) else {
        return 0;
    };
    unsafe { alloc(layout) as u32 }
}

#[no_mangle]
pub extern "C" fn deallocate_points(pointer: u32, point_count: u32) {
    let Some(value_count) = (point_count as usize).checked_mul(2) else {
        return;
    };
    let Ok(layout) = Layout::array::<f64>(value_count) else {
        return;
    };
    if pointer != 0 {
        unsafe { dealloc(pointer as *mut u8, layout) };
    }
}

#[no_mangle]
pub extern "C" fn allocate_path_ends(path_count: u32) -> u32 {
    let Ok(layout) = Layout::array::<u32>(path_count as usize) else {
        return 0;
    };
    unsafe { alloc(layout) as u32 }
}

#[no_mangle]
pub extern "C" fn deallocate_path_ends(pointer: u32, path_count: u32) {
    let Ok(layout) = Layout::array::<u32>(path_count as usize) else {
        return;
    };
    if pointer != 0 {
        unsafe { dealloc(pointer as *mut u8, layout) };
    }
}

#[no_mangle]
pub extern "C" fn allocate_coverage(sample_count: u32) -> u32 {
    let Ok(layout) = Layout::array::<u8>(sample_count as usize) else {
        return 0;
    };
    unsafe { alloc(layout) as u32 }
}

#[no_mangle]
pub extern "C" fn deallocate_coverage(pointer: u32, sample_count: u32) {
    let Ok(layout) = Layout::array::<u8>(sample_count as usize) else {
        return;
    };
    if pointer != 0 {
        unsafe { dealloc(pointer as *mut u8, layout) };
    }
}

#[no_mangle]
pub extern "C" fn rasterize_paths(
    points_pointer: u32,
    point_count: u32,
    path_ends_pointer: u32,
    path_count: u32,
    start_x: f64,
    start_y: f64,
    step: f64,
    columns: u32,
    rows: u32,
    output_pointer: u32,
) -> u32 {
    if points_pointer == 0
        || path_ends_pointer == 0
        || output_pointer == 0
        || point_count == 0
        || path_count == 0
        || columns == 0
        || rows == 0
    {
        return 0;
    }
    let Some(value_count) = (point_count as usize).checked_mul(2) else {
        return 0;
    };
    let Some(sample_count) = (columns as usize).checked_mul(rows as usize) else {
        return 0;
    };

    let coordinate_values =
        unsafe { slice::from_raw_parts(points_pointer as *const f64, value_count) };
    let points: Vec<(f64, f64)> = coordinate_values
        .chunks_exact(2)
        .map(|point| (point[0], point[1]))
        .collect();
    let path_ends =
        unsafe { slice::from_raw_parts(path_ends_pointer as *const u32, path_count as usize) };
    let path_ends: Vec<usize> = path_ends.iter().map(|&end| end as usize).collect();
    let output = unsafe { slice::from_raw_parts_mut(output_pointer as *mut u8, sample_count) };
    rasterize_paths_into(
        &points,
        &path_ends,
        (start_x, start_y),
        step,
        columns,
        rows,
        output,
    )
}

#[cfg(test)]
mod tests {
    use super::{rasterize_paths_into, PreparedEdge};

    #[test]
    fn classifies_samples_inside_a_polygon() {
        let mut output = [0; 9];
        let inside_count = rasterize_paths_into(
            &[(0.0, 0.0), (12.0, 0.0), (12.0, 12.0), (0.0, 12.0)],
            &[4],
            (0.0, 0.0),
            4.0,
            3,
            3,
            &mut output,
        );

        assert_eq!(inside_count, 9);
        assert_eq!(output, [1; 9]);
    }

    #[test]
    fn supports_holes_independent_of_ring_winding() {
        let points = [
            (0.0, 0.0),
            (12.0, 0.0),
            (12.0, 12.0),
            (0.0, 12.0),
            (4.0, 4.0),
            (8.0, 4.0),
            (8.0, 8.0),
            (4.0, 8.0),
        ];
        let mut output = [0; 9];
        let inside_count =
            rasterize_paths_into(&points, &[4, 8], (0.0, 0.0), 4.0, 3, 3, &mut output);
        assert_eq!(inside_count, 8);
        assert_eq!(output[4], 0);

        let reversed_hole = [
            (0.0, 0.0),
            (12.0, 0.0),
            (12.0, 12.0),
            (0.0, 12.0),
            (4.0, 8.0),
            (8.0, 8.0),
            (8.0, 4.0),
            (4.0, 4.0),
        ];
        let reversed_count =
            rasterize_paths_into(&reversed_hole, &[4, 8], (0.0, 0.0), 4.0, 3, 3, &mut output);
        assert_eq!(reversed_count, inside_count);
    }

    #[test]
    fn classifies_points_on_polygon_edges_as_inside() {
        let edges = [
            PreparedEdge {
                start: (0.0, 0.0),
                end: (8.0, 0.0),
                min_y: 0.0,
                max_y: 0.0,
                inverse_slope: 0.0,
            },
            PreparedEdge {
                start: (8.0, 0.0),
                end: (8.0, 8.0),
                min_y: 0.0,
                max_y: 8.0,
                inverse_slope: 0.0,
            },
            PreparedEdge {
                start: (8.0, 8.0),
                end: (0.0, 8.0),
                min_y: 8.0,
                max_y: 8.0,
                inverse_slope: 0.0,
            },
            PreparedEdge {
                start: (0.0, 8.0),
                end: (0.0, 0.0),
                min_y: 0.0,
                max_y: 8.0,
                inverse_slope: 0.0,
            },
        ];
        assert!(super::contains_point(&edges, 4.0, 0.0));
    }
}
