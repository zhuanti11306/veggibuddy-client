
@group(0) @binding(0) var<uniform> resolution: vec2<f32>;
@group(1) @binding(0) var<uniform> transform: mat2x2<f32>;

struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) color: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var aspect = resolution.x / resolution.y;
    var position = transform * input.position / select(vec2f(aspect, 1.0), vec2f(1.0, 1/aspect), resolution.x < resolution.y);
    output.position = vec4<f32>(position, 0.0, 1.0);
    output.color = input.color;
    return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
    return input.color;
}