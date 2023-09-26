let canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const subSetSum = function(input, sum) {

    let y = input.length;
    let x = sum;

    if(input.length === 0) return 0;

    let d = [];

    //fill the rows
    for (let i = 0; i <= y; i++) {
      d[i] = [];
      d[i][0] = true;
    }
    
    for (let j = 1; j <= y; j++) { //j row
      for (let i = 1; i <= x; i++) { //i column
      let num = input[j-1];
        if(num === i) {
          d[j][i] = true;
        } else if(d[j-1][i]) {
          d[j][i] = true;
        } else if (d[j-1][i-num]) {
          d[j][i] = true;
        }
      }
    }
    
    //console.table(d); //uncomment to see the table
    if(!d[y][x]) return null;

    let searchedSet = [];
    for(let j=input.length, i=sum; j>0 && i != 0; j--) {
      if(input[j-1] !== i) {
        while(d[j-1][i]) { // go up
          j--;
        }
      }
      searchedSet.push(input[j-1]);
      i = i-input[j-1];
    }

    return searchedSet;
};

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
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    var r = parseInt(result[1], 16);
    var g = parseInt(result[2], 16);
    var b = parseInt(result[3], 16);

    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    } else {
        var d = max - min;
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

const interpolate_colors = (color1, color2, n_colors) => {

    let hsl_1 = toHSL(color1)
    let hsl_2 = toHSL(color2)

    let h_step = (hsl_2[0] - hsl_1[0])/(n_colors - 1)
    let s_step = (hsl_2[1] - hsl_1[1])/(n_colors - 1)
    let l_step = (hsl_2[2] - hsl_1[2])/(n_colors - 1)

    let palette = []

    for(let i = 0; i<n_colors ; i++){
        palette.push(`hsl(
            ${hsl_1[0] + i*h_step}, 
            ${Math.max(Math.min(hsl_1[1] + i*s_step, 100), 0)}%, 
            ${Math.max(Math.min(hsl_1[2] + i*l_step, 100), 0)}%)`)
    }

    return palette
}

function Grid({step, w, h, color_start, color_end, style, target_offset, reward, penalty}){

    this.step = step
    this.w = w
    this.h = h
    this.n_rows = Math.floor(this.h / this.step)
    this.n_cols = Math.floor(this.w / this.step)
    this.color = '#ffffff00'
    this.lit = []
    this.grid = []
    this.target_offset = target_offset
    this.reward = reward
    this.penalty = penalty
    this.palette = []
    
    for(let i=0; i<this.n_rows; i++){
        this.grid[i] = Array(this.n_cols).fill(0)
    }

    // const make_palette = (c_start, c_end) => {
    //     this.palette = interpolate_colors(c_start, c_end, n_states-1)
    // }

    // make_palette(color_start, color_end)

    this.random_fill = p => {
        for(let i = 0; i<this.n_rows; i++){
            for(let j = 0;j<this.n_cols; j++){
                this.grid[i][j] = Math.floor(Math.random()*2) +1
    }}}

    this.neighbors = (i,j) => [[i-1, j-1], [i-1, j], [i-1, j+1], [i, j-1], [i, j+1], [i+1, j-1], [i+1, j], [i+1, j+1]]

    // get states of neighbours
    this.states_from_neighbors = (i,j) => {
        let neighs = this.neighbors(i,j)
        return neighs.map( n => this.grid[(this.n_rows + n[0]) % this.n_rows][(this.n_cols + n[1]) % this.n_cols])
    }

    this.update = () => {

        let new_array = []

        for(let i=0; i<this.n_rows; i++){
            new_array[i] = Array(this.n_cols).fill(0)
        }

        for(let i=0; i<this.n_rows; i++){
            for(let j=0; j<this.n_cols; j++){

                // describe behavior of cell i,j 

                // let neighs = this.neighbors(i,j)
                // let new_state = this.grid[i][j]
                const neighs = this.states_from_neighbors(i,j)

                const sum_to_reach = this.grid[i][j] + this.target_offset
                if(subSetSum(neighs, sum_to_reach)){
                    new_array[i][j] = this.grid[i][j] +  this.reward
                }
                else new_array[i][j] = Math.max(this.grid[i][j] - this.penalty, 0)

                // new_array[i][j] = new_state
            }
        }

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
                            c.fillStyle = `hsl(${(temp - 1) * 15 + 0},70%,50%)`
                            c.fillRect(j * this.step, i * this.step, this.step, this.step)
                        // case 'circle':
                        //     c.beginPath()
                        //     c.arc(j*this.step + this.step/2, i*this.step + this.step/2, this.step/2, 0, 2*Math.PI)
                        //     c.fillStyle = color
                        //     c.fill()
                    }}}}}
       

    const get_origin_idx = ({x, y}) => {

        let nth_col = Math.floor( x / this.step )
        let nth_row = Math.floor( y / this.step )

        return [nth_row, nth_col]}

    this.light_at_xy = ({x, y}) => {

        let nth_row = Math.floor( x / this.step )
        let nth_col = Math.floor( y / this.step )
        c.fillStyle = '#ffffff33'
        c.fillRect(nth_row * step, nth_col * step, this.step, this.step)}
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

    let n_states = Math.floor(Math.random() * 16)

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

   return [B, S, n_states]
}

let [target_offset, reward, penalty] = [6,3,5]

const loop = () => {

    requestAnimationFrame(loop)

    if(START){
        c.fillStyle='black'
        c.fillRect(0,0,canvas.width, canvas.height)
        grid.draw()
        grid.update()

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
        color_start: '#ffffff',
        color_end: '#0000ff',
        style: style,
        target_offset,
        reward,
        penalty,
    })
    c.fillStyle='black'
    c.fillRect(0,0,canvas.width, canvas.height)
    grid.random_fill(0.5)
    grid.draw()
}

let MOUSEDOWN = false
let RIGHTMOUSEDOWN = false

window.addEventListener('resize', e => {
    init()
})

window.addEventListener('mousemove', e => {
    MOUSE.x = e.x
    MOUSE.y = e.y
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
})

window.addEventListener('wheel', e => {
    e.preventDefault()
    size *= 1.1**Math.sign(e.deltaY)
    init()
})

init()
loop()
// console.log(subSetSum([7,11,22], 34))