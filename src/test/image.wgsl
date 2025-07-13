
@group(0) @binding(0) var texture: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) texCoord: vec2<f32>,
};

@vertex
fn vertex_main(@location(0) position: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(position, 0.0, 1.0);
    output.color = (vec4f(position, 0.0, 1.0) + 1) / 2;
    output.texCoord = (position + 1) / 2;
    return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // return input.color;
    var color = textureSample(texture, texSampler, input.texCoord) * input.color;
    return color;
}