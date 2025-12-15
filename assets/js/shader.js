// assets/js/shader.js

function initShaderBackground(canvasId) {
    console.log("Shader başlatılıyor...", canvasId); // Kontrol Logu
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.error("HATA: Shader canvas bulunamadı! ID:", canvasId);
        return;
    }

    // Canvas boyutlarını hemen ayarla
    const resizeCanvas = () => {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        // WebGL viewport güncellemesi render içinde yapılacak
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // İlk boyutlandırma

    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.warn('WebGL desteklenmiyor.');
        return;
    }

    // Vertex Shader
    const vsSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    // Fragment shader source code (Hata vermemesi için precision eklendi)
    const fsSource = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;

        // Sabitler
        const float scale = 5.0;
        const vec4 gridColor = vec4(0.5);
        const vec4 lineColor = vec4(0.4, 0.2, 0.8, 1.0);
        const vec4 bgColor1 = vec4(0.1, 0.1, 0.3, 1.0);
        const vec4 bgColor2 = vec4(0.3, 0.1, 0.5, 1.0);

        // Yardımcı Fonksiyonlar
        float random(float t) {
            return fract(sin(t) * 43758.5453123); // Daha güvenli random fonksiyonu
        }

        void main() {
            vec2 fragCoord = gl_FragCoord.xy;
            vec2 uv = fragCoord.xy / iResolution.xy;
            
            // Basit bir dalga efekti (Performanslı ve garantili)
            float time = iTime * 0.5;
            
            // Arka plan gradyanı
            vec4 color = mix(bgColor1, bgColor2, uv.y);
            
            // Dalgalar
            for(float i = 1.0; i < 4.0; i++) {
                float wave = sin(uv.x * 3.0 * i + time + i * 135.0) * 0.1;
                wave += sin(uv.x * 7.0 * i - time * 0.5) * 0.05;
                
                float line = 0.005 / abs(uv.y - 0.5 + wave);
                color += lineColor * line * (0.5 / i);
            }

            // Hafif vignette
            float vig = 1.0 - length(uv - 0.5);
            color *= vig * 1.5;

            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    // Shader Derleme Yardımcısı
    const loadShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader derleme hatası: ', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return;

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program link hatası: ', gl.getProgramInfoLog(shaderProgram));
        return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
            time: gl.getUniformLocation(shaderProgram, 'iTime'),
        },
    };

    let startTime = Date.now();
    function render() {
        resizeCanvas(); // Her karede boyutu kontrol et (Garanti olsun)
        gl.viewport(0, 0, canvas.width, canvas.height);

        const currentTime = (Date.now() - startTime) / 1000;

        gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(programInfo.program);
        gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
        gl.uniform1f(programInfo.uniformLocations.time, currentTime);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    console.log("Shader render döngüsü başlıyor...");
    render();
}

// Sayfa yüklendiğinde başlat
// Sayfa yüklendiğinde başlat (VUE tarafında mounted içinde çağrılacak)
// document.addEventListener('DOMContentLoaded', () => {
//     setTimeout(() => {
//         initShaderBackground('hero-shader-canvas');
//     }, 100);
// });
window.initShaderBackground = initShaderBackground; // Global erişim için garanti et
