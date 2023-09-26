let canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const array_shuffle = (array) => {
    if (!Array.isArray(array)) {
        throw new TypeError(`Expected an array, got ${typeof array}`);
    }

    array = [...array];

    for (let index = array.length - 1; index > 0; index--) {
        const newIndex = Math.floor(Math.random() * (index + 1));
        [array[index], array[newIndex]] = [array[newIndex], array[index]];
    }

    return array;
}

const toHSL = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(360*h);
    s = Math.round(s*100);
    l = Math.round(l*100);

    return [h, s, l]
}

const toRGB = hex => {

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    return [r, g, b]
}

const interpolate_colors_hsv = (color1, color2, n_colors) => {

    let hsl_1 = toHSL(color1)
    let hsl_2 = toHSL(color2)

    let h_step = (hsl_2[0] - hsl_1[0])/(n_colors - 1)
    let s_step = (hsl_2[1] - hsl_1[1])/(n_colors - 1)
    let l_step = (hsl_2[2] - hsl_1[2])/(n_colors - 1)

    let palette = [color1]

    for(let i = 0; i<n_colors-1 ; i++){
        palette.push(`hsl(
            ${hsl_1[0] + i*h_step}, 
            ${Math.max(Math.min(hsl_1[1] + i*s_step, 100), 0)}%, 
            ${Math.max(Math.min(hsl_1[2] + i*l_step, 100), 0)}%)`)
    }

    return [...palette, color2]

}


const interpolate_colors_rgb = (color1, color2, n_colors) => {

    let rgb_1 = toRGB(color1)
    let rgb_2 = toRGB(color2)

    let r_step = (rgb_2[0] - rgb_1[0])/(n_colors - 1)
    let g_step = (rgb_2[1] - rgb_1[1])/(n_colors - 1)
    let b_step = (rgb_2[2] - rgb_1[2])/(n_colors - 1)

    let palette = [color1]

    for(let i = 1; i<n_colors-1 ; i++){
        palette.push(`rgb(${rgb_1[0] + i*r_step}, ${rgb_1[1] + i*g_step}, ${rgb_1[2] + i*b_step})`)
    } 
    return [...palette, color2]

}

function Grid({step, w, h, color_start, color_end, style, n_states, B, S}){

    this.step = step
    this.w = w
    this.h = h
    this.n_rows = Math.floor(this.h / this.step)
    this.n_cols = Math.floor(this.w / this.step)
    this.color = '#ffffff00'
    this.lit = []
    this.grid = []
    this.n_states = n_states
    this.B = B
    this.S = S
    this.palette = []
    
    for(let i=0; i<this.n_rows; i++){
        this.grid[i] = Array(this.n_cols).fill(0)
    }

    const make_palette = (c_start, c_end) => {
        this.palette = interpolate_colors_rgb(c_start, c_end, n_states-1)
    }

    make_palette(color_start, color_end)

    console.log(n_states, this.palette.length)

    const n_occurences = (array, element, n) => {
        
        // true if element appears n times in array

        let counter = 0
        for(let i=0; i<array.length; i++){
            if(array[i] === element) counter ++
        }
        return counter === n

    }

    const any = (array, el) => {
        for(let i = 0; i<array.length; i++){
            if(array[i] === el){
                return true
            }
        }
        return false
    }

    this.random_fill = p => {
        for(let i = 0; i<this.n_rows; i++){
            for(let j = 0;j<this.n_cols; j++){
                this.grid[i][j] = Math.random() < p ? 1 : 0
    }}}

    const check_satisfies = (i, j, B_or_S) => {

        let states = this.states_from_neighbors(i,j)
        let survivability = B_or_S.map( b_s => n_occurences(states, 1, b_s) )
        let survived = any(survivability, true)
        return survived
    }

    this.neighbors = (i,j) => [[i-1, j-1], [i-1, j], [i-1, j+1], [i, j-1], [i, j+1], [i+1, j-1], [i+1, j], [i+1, j+1]]

    this.states_from_neighbors = (i,j) => {
        let neighs = this.neighbors(i,j)
        return neighs.map( n => this.grid[(this.n_rows + n[0]) % this.n_rows][(this.n_cols + n[1]) % this.n_cols])
    }

    this.update = () => {

        let new_array = []

        for(let i=0; i<this.n_rows; i++){ // initialize 0 array
            new_array[i] = Array(this.n_cols).fill(0)
        }

        for(let i=0; i<this.n_rows; i++){
            for(let j=0; j<this.n_cols; j++){ // iterate over every cell

                // let neighs = this.neighbors(i,j)
                let new_state = this.grid[i][j]

                if(this.grid[i][j] === 0){ // birth
                    if(check_satisfies(i, j, this.B)){
                        new_state = 1
                    }
                }
                else {
                    if(this.grid[i][j] === 1){ // survival
                        if(check_satisfies(i, j, this.S)){
                            new_state = 1
                        } 
                        else new_state = (this.grid[i][j] + 1) % this.n_states
                    }
                    else{
                        if(this.grid[i][j] >= 1){
                            new_state = (this.grid[i][j] + 1) % this.n_states
                        }}}

                new_array[i][j] = new_state
            }}

        this.grid = new_array
    }

    this.draw = () => {

        for(let i=0; i<this.n_rows; i++){
            for(let j=0; j<this.n_cols; j++){
                if(this.grid[i][j] >= 1){
                    
                    let temp = this.grid[i][j]
                    let offset = 0

                    switch(style){
                        case 'square':
                            // c.fillStyle = color
                            // c.fillStyle = `hsl(${-60 + (temp-1)*-2}, 80%, ${(temp - 1) * 3}%)`
                            // c.fillStyle = `hsl(${(temp - 1) * 15 + 0},70%,50%)`
                            c.fillStyle = this.palette[temp-1]
                            c.fillRect(j * this.step, i * this.step, this.step, this.step)
                            
                            
                        // case 'circle':
                        //     c.beginPath()
                        //     c.arc(j*this.step + this.step/2, i*this.step + this.step/2, this.step/2, 0, 2*Math.PI)
                        //     c.fillStyle = color
                        //     c.fill()
                    }}}}

        
        c.save()
        c.font = 'bold 48px monospace'
        c.fillStyle ='#00FF00'
        c.fillText(`B=[${this.B}], S=[${this.S}], N=[${this.n_states}]`, 50, 50)
        c.restore()

    }
       

    const get_origin_idx = ({x, y}) => {

        let nth_col = Math.floor( x / this.step )
        let nth_row = Math.floor( y / this.step )

        return [nth_row, nth_col]}

    this.light_at_xy = ({x, y}) => {

        let nth_row = Math.floor( x / this.step )
        let nth_col = Math.floor( y / this.step )
        c.fillStyle = '#ffffff33'
        c.fillRect(nth_row * step, nth_col * step, this.step, this.step)}

    this.switch = (x, y) => {

        let [ox, oy] = get_origin_idx({x:x, y:y})
        console.log(this.grid[ox][oy])
        this.grid[ox][oy] = 1-this.grid[ox][oy]}
}

let MOUSE = {
    x: null,
    y: null
}


let START = true
let grid = null
let size = 200

const eucl_dist = (x1, x2) => {
    return Math.sqrt((x1[0] - x2[0])**2 + (x1[1] - x2[1])**2)
}

const random_init = () => {

    let n_states = Math.floor(Math.random() * 16) + 1

    let n_B = Math.floor(Math.random() * 7) + 1
    let n_S = Math.floor(Math.random() * 7) + 1
    let B = []
    let S = []

    let shuffled_B = array_shuffle([...Array(8).keys()])
    let shuffled_S = array_shuffle([...Array(8).keys()])

    for(let i=0; i<n_B; i++){
        B.push(shuffled_B[i]+1)
    }

    for(let i=0; i<n_S; i++){
        S.push(shuffled_S[i]+1)
    }

    console.log(B, S, n_states)

   return [B, S, n_states]
}

const DENSITY = 0.1

// let [B,S,n_states] = random_init()
// let [B,S,n_states] = [[1],[3,7,4,6,8],14] // bulles
let [B,S,n_states] = [[2], [03, 4, 5], 4]
// let [B,S,n_states] = [[1,5],[3,7,4,6,8],1024]
// let [B,S,n_states] = [[2], [3, 4, 5], 4]

// 

const loop = () => {

    requestAnimationFrame(loop)

    if(START){
        c.fillStyle='black'
        c.fillRect(0,0,canvas.width, canvas.height)
        grid.update()
        grid.draw()

    // grid.light_at_xy(MOUSE)
        // START = !START
    }
}

const init = (color='#ff0000', style='square') => {
    
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    grid = new Grid({
        step: canvas.width/size,
        w: canvas.width,
        h: canvas.height,
        color_start: '#ff0000',
        color_end: '#FFBB00',
        style: style,
        B,
        S,
        n_states,
    })
    c.fillStyle='black'
    c.fillRect(0,0,canvas.width, canvas.height)
    grid.random_fill(DENSITY)
    grid.draw()
}

let MOUSEDOWN = false
let RIGHTMOUSEDOWN = false

window.addEventListener('resize', (e) => {
    init()
})

window.addEventListener('mousemove', e => {
    MOUSE.x = e.x
    MOUSE.y = e.y
})

window.addEventListener('mousedown', e => {
    MOUSEDOWN = true
    grid.switch(MOUSE.x, MOUSE.y)
})

window.addEventListener('keydown', e => {
    if(e.code==='Space'){
        START = !START
    }
    if(e.code==='ArrowDown'){
        size/=1.1
        init()
    }
    if(e.code==='ArrowUp'){
        size*=1.1
        init()
    }
    if(e.code==='KeyR'){
        init()
    }
    if(e.code==='KeyS'){
        [B,S,n_states] = random_init()
        grid.B = B
        grid.S = S
        grid.n_states = n_states
        init()
    }
})

window.addEventListener('wheel', e => {
    e.preventDefault()
    size *= 1.1**Math.sign(e.deltaY)
    init()
})

init()
loop()