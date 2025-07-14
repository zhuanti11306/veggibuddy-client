struct Geometry {
    size: vec2f,
    position: vec2f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> screen: vec2f;

@group(1) @binding(0) var<uniform> geometry: Geometry;
@group(1) @binding(1) var component_texture: texture_2d<f32>;
@group(1) @binding(2) var component_sampler: sampler;

@vertex
fn vertex_main(@location(0) pos: vec2f) -> VertexOutput {
    var output: VertexOutput;
    // pos 的範圍為 -1.0 至 1.0
    // 將本地座標縮放到元件的畫素尺寸
    // 然後平移到元件的左上角畫素位置
    // 注意：這裡假設 geometry.position 是左上角座標
    let normalized_pos = (pos + 1.0) * 0.5;

    let world_pos = geometry.position + geometry.size * normalized_pos;

    let screen_pos = (world_pos / screen) * 2.0 - 1.0;

    output.position = vec4f(screen_pos, 0.0, 1.0);
    output.uv = normalized_pos; // 將 UV 座標映射到 [0, 1] 範圍

    return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    // 使用從 vertex shader 傳來的 uv 座標對紋理進行採樣
    return textureSample(component_texture, component_sampler, input.uv);

    // var color = textureSample(component_texture, component_sampler, input.uv);

    // var alpha = color.a;
    // var oneMinusAlpha = 1.0 - alpha;

    // var red = vec4f(1.0, 0.0, 0.0, 1.0); // 紅色

    // var newColor = vec4f(
    //     color.rgb * alpha + red.rgb * oneMinusAlpha,
    //     1.0
    // );    

    // return newColor;
}