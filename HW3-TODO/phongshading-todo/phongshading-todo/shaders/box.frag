#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, specularStrength, diffuseStrength, shininess;

in vec3 Normal;      // 法向量
in vec3 FragPos;     // 相机观察的片元位置
in vec2 TexCoord;    // 纹理坐标
in vec4 FragPosLightSpace; // 光源观察的片元位置

uniform vec3 viewPos;     // 相机位置
uniform vec4 u_lightPosition; // 光源位置	
uniform vec3 lightColor;  // 入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler; // 盒子纹理采样器

float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // 1. 执行透视除法，将齐次坐标转换为归一化设备坐标(NDC) [-1,1]
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    
    // 2. 将NDC坐标映射到纹理坐标空间 [0,1]
    projCoords = projCoords * 0.5 + 0.5;
    
    // 3. 检查坐标是否在有效范围内，超出范围的不应该有阴影
    if(projCoords.x < 0.0 || projCoords.x > 1.0 || 
       projCoords.y < 0.0 || projCoords.y > 1.0 || 
       projCoords.z > 1.0) {
        return 0.0; // 不在阴影贴图范围内，不是阴影
    }
    
    // 4. 获取阴影贴图中存储的深度值（最近的深度）
    float closestDepth = texture(depthTexture, projCoords.xy).r;
    
    // 5. 获取当前片段在光源空间中的深度
    float currentDepth = projCoords.z;
    
    // 6. 计算阴影偏移，避免自阴影问题（Peter Panning）
    // 偏移量基于表面法线与光线方向的夹角，表面越倾斜，偏移越大
    float bias = max(0.005 * (1.0 - dot(normal, lightDir)), 0.0005);
    
    // 7. 基础阴影测试：如果当前深度大于存储的深度减去偏移，则在阴影中
    float shadow = 0.0;
    if(currentDepth - bias > closestDepth) {
        shadow = 1.0; // 在阴影中
    }
    
    return shadow;
}

void main()
{
    // 采样纹理颜色
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    // 计算光照颜色
    vec3 norm = normalize(Normal);
    vec3 lightDir;
    if(u_lightPosition.w == 1.0) 
        lightDir = normalize(u_lightPosition.xyz - FragPos);
    else 
        lightDir = normalize(u_lightPosition.xyz);
    
    vec3 viewDir = normalize(viewPos - FragPos);
    vec3 halfDir = normalize(viewDir + lightDir);

    // 根据phong shading方法计算ambient, diffuse, specular
    vec3 ambient = ambientStrength * lightColor;
    
    // 漫反射计算
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * lightColor * diff;
    
    // 镜面反射计算（使用Blinn-Phong模型，基于已计算的halfDir）
    float spec = pow(max(dot(norm, halfDir), 0.0), shininess);
    vec3 specular = specularStrength * lightColor * spec;
    
    vec3 lightReflectColor = ambient + diffuse + specular;

    // 判定是否阴影，并对各种颜色进行混合
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
    
    // 最终颜色计算
    vec3 resultColor = (1.0 - shadow/2.0) * lightReflectColor * TextureColor;
    
    FragColor = vec4(resultColor, 1.0);
}