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
    // pos 的範圍為 0.0 至 1.0
    // 將本地座標縮放到元件的畫素尺寸
    // 然後平移到元件的左上角畫素位置
    // 注意：這裡假設 geometry.position 是左上角座標
    let world_pos = geometry.position + pos * geometry.size;

    // 將世界畫素座標轉換為標準化設備座標 (NDC, -1.0 to 1.0)
    let ndc_pos = vec2f(
        (world_pos.x / screen.x) * 2.0 - 1.0,
        (world_pos.y / screen.y) * -2.0 + 1.0  // Y 軸向下為正，所以要反轉
    );

    output.position = vec4f(ndc_pos, 0.0, 1.0);
    output.uv = pos; 
    
    return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    // 使用從 vertex shader 傳來的 uv 座標對紋理進行採樣
    return textureSample(component_texture, component_sampler, input.uv);
}