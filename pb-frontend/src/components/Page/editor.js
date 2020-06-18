import React from 'react'
import "../../Editor.css"
var editorContent
class Editor extends React.Component{
    
    componentDidMount(){
    var btn = document.querySelector(".sai");
    var getText = document.querySelector(".getText");
    var content = document.querySelector(".getcontent");
    editorContent= document.querySelector(".editor");
    
    btn.addEventListener("click", function() {
      var s = editorContent.innerHTML;
      content.style.display = "block";
      content.textContent = s;
    });
    
    getText.addEventListener("click", function() {
      const old = editorContent.textContent;
      content.style.display = "block";
      content.textContent = old;
    });
    
   
    
    function copy() {
      document.execCommand("copy", false, "");
    }
    
    // function changeColor() {
    //   var color = prompt("Enter your color in hex ex:#f1f233");
    //   document.execCommand("foreColor", false, color);
    // }
    
    
   
    
    //   if (file) {
    //     console.log("s");
    //     reader.readAsDataURL(file);
    //   }
    // }
    
    // function printMe() {
    //   if (window.alert("Check your Content before print")) {
    //     const body = document.body;
    //     let s = body.innerHTML;
    //     body.textContent = editorContent.innerHTML;
    
    //     document.execCommandShowHelp;
    //     body.style.whiteSpace = "pre";
    //     window.print();
    //     window.location.reload();
    //   }
    }
    link() {
        var url = prompt("Enter the URL");
        document.execCommand("createLink", false, url);
      }
        getImage() {
           debugger

      var file = document.querySelector("input[type=file]").files[0];
    
      var reader = new FileReader();
    
      let dataURI;
    
      reader.addEventListener(
        "load",
        function() {
          dataURI = reader.result;
    
          const img = document.createElement("img");
          img.src = dataURI;
          editorContent.appendChild(img);
        },
        false
      );
    }
    
    
    render(){
        return(
            <div>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>


                <link rel="stylesheet" href="Editor.css"/>
                
            <div class="toolbar">

    <button class="tool-items fa fa-underline"  onClick={()=>document.execCommand('underline', false, '')}>
    </button>

    <button class="tool-items fa fa-italic" onClick={()=>document.execCommand('italic', false, '')}>
    </button>


    <button class="tool-items fa fa-bold" onClick={()=>document.execCommand('bold', false, '')}>
    </button>


    <button class="tool-items fa fa-link" onClick={()=>this.link()}>
    </button>

    <button class="tool-items fa fa-scissors" onClick={()=>document.execCommand('cut',false,'')}></button>


    <input class="tool-items fa fa-file-image-o" type="file" accept="image/*" id="file" style={{"display": "none"}} onChange={this.getImage}/>

    <label for="file" class="tool-items fa fa-file-image-o"></label>





    <button class="tool-items fa fa-undo" onclick="document.execCommand('undo',false,'')"></button>

    <button class="tool-items fa fa-repeat" onClick={()=>document.execCommand('redo',false,'')}></button>

    <button class="tool-items fa fa-tint" onclick="changeColor()"></button>

    <button class="tool-items fa fa-strikethrough" onclick="document.execCommand('strikeThrough',false,'')"></button>

    <button class="tool-items fa fa-trash" onclick="document.execCommand('delete',false,'')"></button>


    <button class="tool-items fa fa-scribd" onclick="document.execCommand('selectAll',false,'')"></button>


    <button class="tool-items fa fa-clone" onclick="copy()"></button>



    <button className="tool-items fa fa-align-center" onclick="document.execCommand('justifyCenter',false,'')"></button>


    <button class="tool-items fa fa-align-left" onclick="document.execCommand('justifyLeft',false,'')"></button>
    <button class="tool-items fa fa-align-right" onclick="document.execCommand('justifyRight',false,'')"></button>
  </div>

  <div class="center">
    <div class="editor" contenteditable="true">
      <h1>Simple Html editor</h1>
      <p>Good to start</p>
    </div>
  </div>

  <div class="center">

    <button className="sai btn">GetHtml</button>
    <button className="getText btn">GetText</button>
    <button className="btn
print" onclick="printMe()">PrintHtml</button>
  </div>



  <div class="center">
    <section class="getcontent">
    </section>
  </div>

    </div>
        
        )
        }
    
}
export default Editor