use std::alloc::{alloc, dealloc, Layout};
use std::slice;

#[inline]
fn edge(start: (f64, f64), end: (f64, f64), x: f64, y: f64) -> f64 {
    (x - start.0) * (end.1 - start.1) - (y - start.1) * (end.0 - start.0)
}

#[inline]
fn is_inside(area: f64, first_edge: f64, second_edge: f64, third_edge: f64) -> bool {
    if area > 0.0 {
        first_edge >= 0.0 && second_edge >= 0.0 && third_edge >= 0.0
    } else if area < 0.0 {
        first_edge <= 0.0 && second_edge <= 0.0 && third_edge <= 0.0
    } else {
        false
    }
}

fn rasterize_triangle_into(
    triangle: [(f64, f64); 3],
    start: (f64, f64),
    step: f64,
    columns: u32,
    rows: u32,
    output: &mut [f64],
) -> u32 {
    let Some(sample_count) = (columns as usize).checked_mul(rows as usize) else {
        return 0;
    };
    let Some(weight_count) = sample_count.checked_mul(3) else {
        return 0;
    };
    if output.len() < weight_count {
        return 0;
    }

    let [first, second, third] = triangle;
    let area = edge(first, second, third.0, third.1);
    let inverse_area = if area == 0.0 { 0.0 } else { 1.0 / area };
    let mut inside_count = 0_u32;
    let mut grid_y = start.1;

    for row in 0..rows {
        let sample_y = grid_y + step / 2.0;
        let mut grid_x = start.0;
        for column in 0..columns {
            let sample_x = grid_x + step / 2.0;
            let first_edge = edge(second, third, sample_x, sample_y);
            let second_edge = edge(third, first, sample_x, sample_y);
            let third_edge = edge(first, second, sample_x, sample_y);
            let output_index = ((row * columns + column) * 3) as usize;

            if is_inside(area, first_edge, second_edge, third_edge) {
                output[output_index] = first_edge * inverse_area;
                output[output_index + 1] = second_edge * inverse_area;
                output[output_index + 2] = third_edge * inverse_area;
                inside_count += 1;
            } else {
                output[output_index] = -1.0;
                output[output_index + 1] = 0.0;
                output[output_index + 2] = 0.0;
            }

            grid_x += step;
        }
        grid_y += step;
    }

    inside_count
}

#[no_mangle]
pub extern "C" fn allocate_weights(sample_count: u32) -> u32 {
    let Some(weight_count) = (sample_count as usize).checked_mul(3) else {
        return 0;
    };
    let Ok(layout) = Layout::array::<f64>(weight_count) else {
        return 0;
    };

    unsafe { alloc(layout) as u32 }
}

#[no_mangle]
pub extern "C" fn deallocate_weights(pointer: u32, sample_count: u32) {
    let Some(weight_count) = (sample_count as usize).checked_mul(3) else {
        return;
    };
    let Ok(layout) = Layout::array::<f64>(weight_count) else {
        return;
    };
    if pointer != 0 {
        unsafe { dealloc(pointer as *mut u8, layout) };
    }
}

#[no_mangle]
pub extern "C" fn rasterize_triangle(
    first_x: f64,
    first_y: f64,
    second_x: f64,
    second_y: f64,
    third_x: f64,
    third_y: f64,
    start_x: f64,
    start_y: f64,
    step: f64,
    columns: u32,
    rows: u32,
    output_pointer: u32,
) -> u32 {
    let Some(sample_count) = (columns as usize).checked_mul(rows as usize) else {
        return 0;
    };
    let Some(weight_count) = sample_count.checked_mul(3) else {
        return 0;
    };
    if output_pointer == 0 || weight_count == 0 {
        return 0;
    }

    let output = unsafe { slice::from_raw_parts_mut(output_pointer as *mut f64, weight_count) };
    rasterize_triangle_into(
        [(first_x, first_y), (second_x, second_y), (third_x, third_y)],
        (start_x, start_y),
        step,
        columns,
        rows,
        output,
    )
}

#[cfg(test)]
mod tests {
    use super::rasterize_triangle_into;

    #[test]
    fn classifies_samples_and_writes_barycentric_weights() {
        let mut output = [0.0; 12];
        let inside_count = rasterize_triangle_into(
            [(0.0, 0.0), (8.0, 0.0), (0.0, 8.0)],
            (0.0, 0.0),
            4.0,
            2,
            2,
            &mut output,
        );

        assert_eq!(inside_count, 3);
        assert_eq!(&output[0..3], &[0.5, 0.25, 0.25]);
        assert_eq!(output[3], 0.0);
        assert_eq!(output[6], 0.0);
        assert_eq!(output[9], -1.0);
    }

    #[test]
    fn supports_reversed_winding_and_skips_degenerate_triangles() {
        let mut output = [0.0; 3];
        let inside_count = rasterize_triangle_into(
            [(0.0, 8.0), (8.0, 0.0), (0.0, 0.0)],
            (0.0, 0.0),
            4.0,
            1,
            1,
            &mut output,
        );
        assert_eq!(inside_count, 1);
        assert!((output.iter().sum::<f64>() - 1.0).abs() < f64::EPSILON);

        let degenerate_count = rasterize_triangle_into(
            [(0.0, 0.0), (8.0, 0.0), (16.0, 0.0)],
            (0.0, 0.0),
            4.0,
            1,
            1,
            &mut output,
        );
        assert_eq!(degenerate_count, 0);
        assert_eq!(output[0], -1.0);
    }
}
