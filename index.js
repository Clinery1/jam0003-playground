// Please ignore this mess of code... It REALLY needs a refactor.


const RAW_SOURCE=document.getElementById("raw_source");
const VIS_SOURCE=document.getElementById("vis_source");
const STDOUT=document.getElementById("stdout");
const VIS_STACK=document.getElementById("vis_stack");
const AUTOSTEP_SPEED=document.getElementById("autorun_speed");


let source=[];
let vis_nodes=[];
let state={};
let error=false;
let finished=false;
let running=false;
let interval=undefined;


function update_interval() {
    if (interval) {
        toggle_interval();
        toggle_interval();
    }
}
function toggle_interval() {
    if (interval==undefined) {
        let delay=30;
        if (AUTOSTEP_SPEED.value=="instant") {
            delay=1;
        } else if (AUTOSTEP_SPEED.value=="fastest") {
            delay=10;
        } else if (AUTOSTEP_SPEED.value=="normal") {
            delay=50;
        } else if (AUTOSTEP_SPEED.value=="slow") {
            delay=150;
        } else if (AUTOSTEP_SPEED.value=="slowest") {
            delay=300;
        }
        interval=setInterval(function(){
            if (!running) {
                step_vis();
            }
            if (finished||error) {
                clearInterval(interval);
                interval=undefined;
            }
        },delay);
    } else {
        clearInterval(interval);
        interval=undefined;
    }
}
function turn_ccw() {
    if (state.directions[state.directions.length-1]==="up") {
        state.directions[state.directions.length-1]="left";
    } else if (state.directions[state.directions.length-1]==="left") {
        state.directions[state.directions.length-1]="down";
    } else if (state.directions[state.directions.length-1]==="down") {
        state.directions[state.directions.length-1]="right";
    } else if (state.directions[state.directions.length-1]==="right") {
        state.directions[state.directions.length-1]="up";
    }
}
function turn_cw() {
    if (state.directions[state.directions.length-1]==="up") {
        state.directions[state.directions.length-1]="right";
    } else if (state.directions[state.directions.length-1]==="right") {
        state.directions[state.directions.length-1]="down";
    } else if (state.directions[state.directions.length-1]==="down") {
        state.directions[state.directions.length-1]="left";
    } else if (state.directions[state.directions.length-1]==="left") {
        state.directions[state.directions.length-1]="up";
    }
}
function next_cell() {
    check_cell();
    if (state.directions[state.directions.length-1]=="up") {
        state.cursors[state.cursors.length-1].y-=1;
    } else if (state.directions[state.directions.length-1]=="down") {
        state.cursors[state.cursors.length-1].y+=1;
    } else if (state.directions[state.directions.length-1]=="left") {
        state.cursors[state.cursors.length-1].x-=1;
    } else if (state.directions[state.directions.length-1]=="right") {
        state.cursors[state.cursors.length-1].x+=1;
    }
}
function prev_cell() {
    check_cell();
    if (state.directions[state.directions.length-1]=="up") {
        state.cursors[state.cursors.length-1].y+=1;
    } else if (state.directions[state.directions.length-1]=="down") {
        state.cursors[state.cursors.length-1].y-=1;
    } else if (state.directions[state.directions.length-1]=="left") {
        state.cursors[state.cursors.length-1].x+=1;
    } else if (state.directions[state.directions.length-1]=="right") {
        state.cursors[state.cursors.length-1].x-=1;
    }
}
function check_cell() {
    if (state.directions[state.directions.length-1]=="up") {
        if (state.cursors[state.cursors.length-1].y==state.borders[state.borders.length-1].tl.y) {
            error=true;
            alert("Error: Hit the top edge");
        }
    } else if (state.directions[state.directions.length-1]=="down") {
        if (state.cursors[state.cursors.length-1].y==state.borders[state.borders.length-1].br.y) {
            error=true;
            alert("Error: Hit the bottom edge");
        }
    } else if (state.directions[state.directions.length-1]=="left") {
        if (state.cursors[state.cursors.length-1].x==state.borders[state.borders.length-1].tl.x) {
            error=true;
            alert("Error: Hit the left edge");
        }
    } else if (state.directions[state.directions.length-1]=="right") {
        if (state.cursors[state.cursors.length-1].x==state.borders[state.borders.length-1].br.x) {
            error=true;
            alert("Error: Hit the right edge");
        }
    }
}
function current_cell() {
    const y=state.cursors[state.cursors.length-1].y;
    const x=state.cursors[state.cursors.length-1].x;
    return source[y][x];
}
function color_cell() {
    const y=state.cursors[state.cursors.length-1].y;
    const x=state.cursors[state.cursors.length-1].x;
    const node=vis_nodes[y][x];
    if (node) {
        node.classList=["active"];
    }
}
function format_item(item) {
    if (item.type==="string") {
        return item.data;
    } else if (item.type==="bool") {
        return String(item.data);
    } else if (item.type==="list") {
        let output="[";
        const last_index=item.data.length-1;
        let i=0;
        for (const element of item.data) {
            if (element.type=="string") {
                output=output+"\""+element.data+"\"";
            } else if (element.type=="char") {
                output=output+"'"+element.data+"'";
            } else {
                output=output+format_item(element);
            }
            if (i<last_index) {
                output=output+",";
            }
            i+=1;
        }
        output=output+"]";
        return output;
    } else if (item.type==="object") {
        let output="{";
        const last_index=Object.keys(item.data).length-1;
        let i=0;
        for (const field_name in item.data) {
            output=output+field_name+":";
            const field=item.data[field_name];
            if (field.type=="string") {
                output=output+"\""+field.data+"\"";
            } else if (field.type=="char") {
                output=output+"'"+field.data+"'";
            } else {
                output=output+format_item(field);
            }
            if (i<last_index) {
                output=output+",";
            }
            i+=1;
        }
        output=output+"}";
        return output;
    } else if (item.type==="char") {
        return item.data;
    } else if (item.type==="float") {
        return String(item.data);
    } else if (item.type==="int") {
        return String(item.data);
    } else {
        return "";
    }
}
function follow_wire() {
    while (true) {
        if (error||finished) {return}
        const c=current_cell();
        if (c==='^') {
            state.directions[state.directions.length-1]="up";
            color_cell();
        } else if (c==="v") {
            state.directions[state.directions.length-1]="down";
            color_cell();
        } else if (c==="<") {
            state.directions[state.directions.length-1]="left";
            color_cell();
        } else if (c===">") {
            state.directions[state.directions.length-1]="right";
            color_cell();
        } else if (c==="|") {
            if (state.directions[state.directions.length-1]==="left"||state.direction==="right") {
                error=true;
                alert("Error: encountered a vertical wire when moving "+state.directions[state.directions.length-1]+" at "+String(state.cursors[state.cursors.length]));
                return;
            }
            color_cell();
        } else if (c==="-") {
            if (state.directions[state.directions.length-1]==="up"||state.direction==="down") {
                error=true;
                alert("Error: encountered a vertical wire when moving "+state.directions[state.directions.length-1]+" at "+String(state.cursors[state.cursors.length]));
                return;
            }
            color_cell();
        } else if (c==="+") {
            color_cell();
        } else {
            prev_cell();
            return;
        }
        next_cell();
    }
}
function follow_function(name,arg_count) {
    state.directions[state.directions.length-1]="right";
    const tl={
        x:state.cursors[state.cursors.length-1].x+1,
        y:state.cursors[state.cursors.length-1].y+1,
    };
    while (true) {  // top border
        next_cell();
        const c=current_cell();
        if (c==="|") {
            break;
        }
        color_cell();
    }
    state.directions[state.directions.length-1]="down";
    while (true) {  // right border
        const c=current_cell();
        if (c==="-") {
            break;
        }
        color_cell();
        next_cell();
    }
    const br={
        x:state.cursors[state.cursors.length-1].x,
        y:state.cursors[state.cursors.length-1].y,
    };
    state.directions[state.directions.length-1]="left";
    while (true) {  // bottom border
        const c=current_cell();
        if (c==="|") {
            break;
        }
        color_cell();
        next_cell();
    }
    state.directions[state.directions.length-1]="up";
    while (true) {  // left border
        const c=current_cell();
        if (c==="P") {
            break;
        }
        color_cell();
        next_cell();
    }
    state.cursors[state.cursors.length-1]={x:br.x,y:br.y};
    state.directions[state.directions.length-1]="right";
    state.functions[name]={
        border:{
            tl:tl,
            br:br,
        },
        arg_count:arg_count,
    };
}
function update_stack() {
    while (VIS_STACK.children.length>0) {
        VIS_STACK.children[0].remove();
    }
    for (let i=state.stacks[state.stacks.length-1].length-1;i>=0;i-=1) {
        const elem=document.createElement("li");
        elem.innerHTML=format_item(state.stacks[state.stacks.length-1][i]);
        VIS_STACK.appendChild(elem);
    }
}
function print(string) {
    if (STDOUT.children.length>0) {
        const elem=STDOUT.children[STDOUT.children.length-1];
        elem.innerHTML+=string;
    } else {
        const elem=document.createElement("li");
        elem.innerHTML=string;
        STDOUT.appendChild(elem);
    }
}
function newline() {
    const elem=document.createElement("li");
    STDOUT.appendChild(elem);
}
function step_vis() {
    if (error||finished) {return}
    running=true;
    for (let y=0;y<vis_nodes.length;y+=1) {
        for (let x=0;x<vis_nodes[y].length;x+=1) {
            vis_nodes[y][x].classList=[];
        }
    }
    let c=current_cell();
    color_cell();
    let string="";
    if (c==="\"") {
        next_cell();
        let c=current_cell();
        color_cell();
        while (c!=="\"") {
            if (error) {running=false;return}
            if (c==="\\") {
                next_cell();
                if (error) {break}
                c=current_cell();
                color_cell();
                switch (c) {
                    case "n":
                        string=string+"\n";
                        break;
                    case "r":
                        string=string+"\r";
                        break;
                    case "t":
                        string=string+"\t";
                        break;
                    case "0":
                        string=string+"\0";
                        break;
                    case "\"":
                        string=string+"\"";
                        break;
                }
            } else {
                string=string+c;
            }
            next_cell();
            c=current_cell();
            color_cell();
        }
        state.stacks[state.stacks.length-1].push({
            type:"string",
            data:string,
        });
    } else if (c==="0"||c==="1"||c==="2"||c==="3"||c==="4"||c==="5"||c==="6"||c==="7"||c==="8"||c==="9") {
        let num_str="";
        let float=false;
        while (c==="0"||c==="1"||c==="2"||c==="3"||c==="4"||c==="5"||c==="6"||c==="7"||c==="8"||c==="9"||c===".") {
            color_cell();
            num_str+=c;
            if (error) {running=false;return}
            if (c===".") {float=true}
            next_cell();
            c=current_cell();
        }
        prev_cell();
        if (float) {
            state.stacks[state.stacks.length-1].push({type:"float",data:Number(num_str)});
        } else {
            state.stacks[state.stacks.length-1].push({type:"int",data:BigInt(num_str)});
        }
    } else if (c==="A") {
        const left=state.stacks[state.stacks.length-1].pop();
        const right=state.stacks[state.stacks.length-1].pop();
        if ((left.type==="int"&&right.type==="int")||(left.type==="float"&&right.type==="float")) {
            const res=left.data+right.data;
            state.stacks[state.stacks.length-1].push({type:left.type,data:res});
        } else if (left.type==="bool"&&right.type==="bool") {
            left.data=left.data||right.data;
            state.stacks[state.stacks.length-1].push(left);
        } else if (left.type==="string") {
            left.data=left.data+format_item(right);
            state.stacks[state.stacks.length-1].push(left);
        } else if (left.type==="list") {
            left.data.push(right);
            state.stacks[state.stacks.length-1].push(left);
        } else {
            error=true;
            alert("Error: invalid type pair for add at "+String(state.cursors[state.cursors.length-1]));
        }
        color_cell();
    } else if (c==="S") {
        const left=state.stacks[state.stacks.length-1].pop();
        const right=state.stacks[state.stacks.length-1].pop();
        if ((left.type==="int"&&right.type==="int")||(left.type==="float"&&right.type==="float")) {
            const res=left.data-right.data;
            state.stacks[state.stacks.length-1].push({type:left.type,data:res});
        } else if (left.type==="object"&&right.type==="string") {
            left.data[right.data]=undefined;
            state.stacks[state.stacks.length-1].push(left);
        } else if (left.type==="string"&&right.type=="int") {
            for (let i=0;i<right.data&&left.data.length>0;i+=1) {
                left.data=left.data.substring(0,t.length-1)
            }
            state.stacks[state.stacks.length-1].push(left);
        } else if (left.type==="list"&&right.type=="int") {
            for (let i=0;i<right.data&&left.data.length>0;i+=1) {
                left.data.pop();
            }
            state.stacks[state.stacks.length-1].push(left);
        } else {
            error=true;
            alert("Error: invalid type pair for sub at "+String(state.cursors[state.cursors.length-1]));
        }
        color_cell();
    } else if (c==="M") {
        const left=state.stacks[state.stacks.length-1].pop();
        const right=state.stacks[state.stacks.length-1].pop();
        if ((left.type==="int"&&right.type==="int")||(left.type==="float"&&right.type==="float")) {
            const res=left.data*right.data;
            state.stacks[state.stacks.length-1].push({type:left.type,data:res});
        } else if (left.type==="bool"&&right.type==="bool") {
            left.data=left.data&&right.data;
            state.stacks[state.stacks.length-1].push(left);
        } else {
            error=true;
            alert("Error: invalid type pair for mul at "+String(state.cursors[state.cursors.length-1]));
        }
        color_cell();
    } else if (c==="D") {
        const left=state.stacks[state.stacks.length-1].pop();
        const right=state.stacks[state.stacks.length-1].pop();
        if ((left.type==="int"&&right.type==="int")||(left.type==="float"&&right.type==="float")) {
            const rem=left.data%right.data;
            const res=left.data/right.data;
            state.stacks[state.stacks.length-1].push({type:left.type,data:res});
            state.stacks[state.stacks.length-1].push({type:left.type,data:rem});
        } else {
            error=true;
            alert("Error: invalid type pair for div at "+String(state.cursors[state.cursors.length-1]));
        }
        color_cell();
    } else if (c==="O") {
        state.stacks[state.stacks.length-1].push({type:"object",data:{}});
        color_cell();
    } else if (c==="F") {
        const object=state.stacks[state.stacks.length-1].pop();
        const name=state.stacks[state.stacks.length-1].pop();
        const data=state.stacks[state.stacks.length-1].pop();
        if (name.type!=="string") {
            error=true;
            alert("Error: attempt to set a field with name that is not a string at "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        if (object.type!=="object") {
            error=true;
            alert("Error: attempt to set a field on type "+object.type+" at "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        object.data[name.data]=data;
        state.stacks[state.stacks.length-1].push(object);
        color_cell();
    } else if (c==="^"||c==="v"||c==="<"||c===">"||c==="|"||c==="-"||c==="+") {
        follow_wire();
    } else if (c==="N") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="int") {
            item.data*=-1n;
        } else if (item.type==="float") {
            item.data*=-1.0;
        } else if (item.type==="bool") {
            item.data=!item.data;
        }
        state.stacks[state.stacks.length-1].push(item);
        color_cell();
    } else if (c==="%") {
        state.stacks[state.stacks.length-1].pop();
        color_cell();
    } else if (c==="C") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="int") {
            item.type="float";
            item.data=Number(item.data);
        } else if (item.type==="float") {
            item.type="int";
            item.data=BigInt(String(item.data).split(".")[0]);
        }
        state.stacks[state.stacks.length-1].push(item);
        color_cell();
    } else if (c==="!") {
        const stack=state.stacks[state.stacks.length-1];
        const item=stack[stack.length-1];
        const formatted=format_item(item);
        const lines=formatted.split("\n");
        print(lines[0]);
        if (lines.length>1) {
            for (let i=1;i<lines.length;i+=1) {
                newline();
                print(lines[i]);
            }
        }
        color_cell();
    } else if (c==="#") {
        const stack=state.stacks[state.stacks.length-1];
        const item=stack[stack.length-1];
        const formatted=format_item(item);
        const lines=formatted.split("\n");
        print(lines[0]);
        if (lines.length>1) {
            for (let i=1;i<lines.length;i+=1) {
                newline();
                print(lines[i]);
            }
        }
        newline();
        color_cell();
    } else if (c==="P") {
        const name=state.stacks[state.stacks.length-1].pop();
        const arg_count=state.stacks[state.stacks.length-1].pop();
        if (name.type!=="string") {
            error=true;
            alert("Error: stack[0] was not a String "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        if (arg_count.type!=="int") {
            error=true;
            alert("Error: stack[1] was not an Int "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        color_cell();
        follow_function(name.data,arg_count.data);
    } else if (c==="G") {
        const a=state.stacks[state.stacks.length-1].pop();
        const b=state.stacks[state.stacks.length-1].pop();
        if (a.type==="int"&&b.type==="int") {
            state.stacks[state.stacks.length-1].push({type:"bool",data:a.data>b.data});
        } else if (a.type==="float"&&b.type==="float") {
            state.stacks[state.stacks.length-1].push({type:"bool",data:a.data>b.data});
        } else {
            state.stacks[state.stacks.length-1].push({type:"bool",data:false});
        }
        color_cell();
    } else if (c==="L") {
        const a=state.stacks[state.stacks.length-1].pop();
        const b=state.stacks[state.stacks.length-1].pop();
        if (a.type==="int"&&b.type==="int") {
            state.stacks[state.stacks.length-1].push({type:"bool",data:a.data<b.data});
        } else if (a.type==="float"&&b.type==="float") {
            state.stacks[state.stacks.length-1].push({type:"bool",data:a.data<b.data});
        } else {
            state.stacks[state.stacks.length-1].push({type:"bool",data:false});
        }
        color_cell();
    } else if (c==="E") {
        const a=state.stacks[state.stacks.length-1].pop();
        const b=state.stacks[state.stacks.length-1].pop();
        if (a.type===b.type) {
            state.stacks[state.stacks.length-1].push({type:"bool",data:a.data===b.data});
        } else {
            state.stacks[state.stacks.length-1].push({type:"bool",data:false});
        }
        color_cell();
    } else if (c==="T") {
        state.stacks[state.stacks.length-1].push({type:"bool",data:true});
        color_cell();
    } else if (c==="V") {
        state.stacks[state.stacks.length-1].push({type:"list",data:[]});
        color_cell();
    } else if (c==="~") {
        color_cell();
        if (state.stacks.length>1) {
            const prev_stack=state.stacks.pop();
            const ret_item=prev_stack.pop();
            if (ret_item!=undefined) {
                state.stacks[state.stacks.length-1].push(ret_item);
            }
            state.cursors.pop();
            state.borders.pop();
            state.directions.pop();
        } else {
            finished=true;
            alert("Program finished");
            running=false;
            return;
        }
    } else if (c==="R") {
        state.stacks[state.stacks.length-1].unshift(state.stacks[state.stacks.length-1].pop());
        color_cell();
    } else if (c==="r") {
        state.stacks[state.stacks.length-1].push(state.stacks[state.stacks.length-1].shift());
        color_cell();
    } else if (c==="*") {
        color_cell();
        const name=state.stacks[state.stacks.length-1].pop();
        if (name.type!=="string") {
            error=true;
            alert("Error: procedure names have to be Strings "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        const f=state.functions[name.data];
        if (f==undefined) {
            error=true;
            alert("Error: procedure `"+name.data+"` does not exist "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        const new_stack=[];
        for (let i=0;i<f.arg_count;i+=1) {
            new_stack.unshift(state.stacks[state.stacks.length-1].pop());
        }
        state.borders.push(f.border);
        state.cursors.push({x:f.border.tl.x,y:f.border.tl.y});
        state.stacks.push(new_stack);
        state.directions.push("right");
        running=false;
        return;
    } else if (c==="U") {
        const data=prompt("STDIN");
        if (data==undefined) {
            error=true;
            finished=true;
            running=false;
            console.log("Simulated STDIN closed");
            return;
        }
        state.stacks[state.stacks.length-1].push({type:"string",data:data});
        if (STDOUT.children.length==0) {
            const elem=document.createElement("li");
            elem.innerHTML=data;
            STDOUT.appendChild(elem);
        } else {
            const elem=STDOUT.children[STDOUT.children.length-1];
            elem.innerHTML+=data;
        }
        const elem=document.createElement("li");
        STDOUT.appendChild(elem);
        color_cell();
    } else if (c==="s") {
        const a=state.stacks[state.stacks.length-1].pop();
        const b=state.stacks[state.stacks.length-1].pop();
        state.stacks[state.stacks.length-1].push(a);
        state.stacks[state.stacks.length-1].push(b);
        color_cell();
    } else if (c==="d") {
        const a=state.stacks[state.stacks.length-1].pop();
        state.stacks[state.stacks.length-1].push(a);
        state.stacks[state.stacks.length-1].push(a);
        color_cell();
    } else if (c==="c") {
        color_cell();
        next_cell();
        color_cell();
        const c=current_cell();
        state.stacks[state.stacks.length-1].push({type:"char",data:c});
    } else if (c===".") {   // string split
        const string=state.stacks[state.stacks.length-1].pop();
        if (string.type==="string") {
            const list=[];
            for (const char of string.data.split("")) {
                list.push({type:"char",data:char});
            }
            state.stacks[state.stacks.length-1].push(string);
            state.stacks[state.stacks.length-1].push({type:"list",data:list});
        } else {
            state.stacks[state.stacks.length-1].push(string);
        }
    } else if (c==="p") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="string") {
            const char=item.data.substring(item.data.length-1);
            item.data=item.data.substring(0,item.data.length-1);
            state.stacks[state.stacks.length-1].push(item);
            state.stacks[state.stacks.length-1].push(char);
        } else if (item.type==="list") {
            const elem=item.data.pop();
            state.stacks[state.stacks.length-1].push(item);
            state.stacks[state.stacks.length-1].push(elem);
        } else {
            state.stacks[state.stacks.length-1].push(item);
        }
    } else if (c==="B") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="bool") {
            if (item.data) {
                turn_ccw();
            } else {
                turn_cw();
            }
        } else {
            turn_cw();
        }
        color_cell();
    } else if (c==="b") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="bool") {
            if (item.data) {
                turn_cw();
            } else {
                turn_ccw();
            }
        } else {
            turn_ccw();
        }
        color_cell();
    } else if (c==="l") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="string"||item.type==="list") {
            state.stacks[state.stacks.length-1].push(item);
            state.stacks[state.stacks.length-1].push({type:"int",data:BigInt(item.data.length)});
        } else {
            state.stacks[state.stacks.length-1].push(item);
            state.stacks[state.stacks.length-1].push({type:"int",data:0n});
        }
        color_cell();
    } else if (c==="@") {
        const max=state.stacks[state.stacks.length-1].pop();
        const min=state.stacks[state.stacks.length-1].pop();
        if (max.type!=="int"||min.type!=="int") {
            error=true;
            alert("Error: expected stack[0] and stack[1] to be ints at "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        let max2=max.data;
        let min2=min.data;
        if (max2<0n) {
            max2*=-1n;
        }
        if (min2<0n) {
            min2*=-1n;
        }
        const range=Number(max2+min2);
        let random=BigInt(Math.trunc(Math.random()*range));
        random+=min.data;
        state.stacks[state.stacks.length-1].push({type:"int",data:random});
        color_cell();
    } else if (c==="&") {
        const max=state.stacks[state.stacks.length-1].pop();
        const min=state.stacks[state.stacks.length-1].pop();
        if (max.type!=="float"||min.type!=="float") {
            error=true;
            alert("Error: expected stack[0] and stack[1] to be floats at "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        const range=Math.abs(max.data)+Math.abs(min.data);
        const random=(Math.random()*range)+min.data;
        state.stacks[state.stacks.length-1].push({type:"float",data:random});
        color_cell();
    } else if (c==="[") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type=="list") {
            item.data.push(item.data.shift());
        }
        state.stacks[state.stacks.length-1].push(item);
        color_cell();
    } else if (c==="]") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type=="list") {
            item.data.unshift(item.data.pop());
        }
        state.stacks[state.stacks.length-1].push(item);
        color_cell();
    } else if (c==="$") {
        const item=state.stacks[state.stacks.length-1].pop();
        if (item.type==="int") {
            if (item.data>0x10ffff) {
                error=true;
                alert("Error: invalid char cast at "+String(state.cursors[state.cursors.length-1]));
                running=false;
                return;
            }
            const code_point=String.fromCodePoint(Number(item.data));
            console.log("Casting Int `"+String(item.data)+"` to `"+code_point+"`");
            state.stacks[state.stacks.length-1].push({type:"char",data:code_point});
        } else if (item.type==="char") {
            const code_point=item.data.charCodeAt(0);
            console.log("Casting Char `"+item.data+"` to `"+code_point+"`");
            state.stacks[state.stacks.length-1].push({type:"int",data:BigInt(code_point)});
        } else {
            error=true;
            alert("Error: attempt to cast "+item.type+" to char at "+String(state.cursors[state.cursors.length-1]));
            running=false;
            return;
        }
        color_cell();
    } else {
        // console.log(current_cell());
        color_cell();
    }
    next_cell();
    update_stack();
    running=false;
    // ++++++++++++++++++++++++++++++++.
}
function convert_source() {
    source=[];
    while (STDOUT.children.length>0) {
        STDOUT.children[0].remove();
    }
    vis_nodes=[];
    while (VIS_SOURCE.children.length>0) {
        VIS_SOURCE.children[0].remove();
    }
    finished=false;
    error=false;
    let max=0;
    for (const line of RAW_SOURCE.value.split("\n")) {
        const source_line=[];
        const vis_line=[];
        for (const char of line.split("")) {
            source_line.push(char);
            const elem=document.createElement("span");
            elem.innerHTML=char;
            VIS_SOURCE.appendChild(elem);
            vis_line.push(elem);
        }
        if (source_line.length>max) {
            max=source_line.length;
        }
        vis_nodes.push(vis_line);
        VIS_SOURCE.appendChild(document.createElement("br"));
        source.push(source_line);
    }
    for (let i=0;i<source.length;i+=1) {
        while (source[i].length<max) {
            source[i].push(' ');
            const elem=document.createElement("span");
            elem.innerHTML=' ';
            VIS_SOURCE.appendChild(elem);
            vis_nodes.push(elem);
        }
    }
    state={
        cursors:[
            {x:0,y:0},
        ],
        directions:[
            "right",
        ],
        borders:[
            {
                tl:{
                    x:0,
                    y:0,
                },
                br:{
                    x:max,
                    y:source.length,
                },
            },
        ],
        stacks:[
            [],
        ],
        functions:{},
    };
    update_stack();
}
