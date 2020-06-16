import React from "react"
import axios from 'axios'
class SignUpForm extends React.Component{
    constructor(){
        super()
            this.state={
                name: "",
                username:"",
                password:""    
            }
    }
    componentDidMount(){
        fetch("http://localhost:9000/users").then(res=>res.json()).then(obj=>{
            debugger
        }).catch(err=>console.log(err))
    }
    handleOnChange = e =>{   
        this.setState({[e.target["name"]]: e.target.value})
    }
    handleOnSubmit = e =>{
        e.preventDefault()
        const {name,username,password}=this.state
        let user = {name,username,password}
       let body = user
 
    let config={
        method: 'post',
        url: '/users',
        timeout: 4000,    // 4 seconds timeout
        data: user}
    axios(config)
      .then(response => response.json()).then(obj=>{
          debugger
      })
      .catch(error => console.error('timeout exceeded'))
        // fetch("http://localhost:9000/users", config).then(res=>res.json()).then(res=>{
        //     debugger
        //     console.log(res)
        // }).catch(err=>console.log(err))
    }
    render(){
        return(<div>

                <form className="SignUpForm" onSubmit={(e)=>this.handleOnSubmit(e)} method="POST" onSubmit={this.handleOnSubmit}> 
                    <label htmlFor="name">Name:</label>
                    <input type="text" name="name" 
                    onChange={this.handleOnChange} />
                    <br/>
                    <label htmlFor="username">Username:</label>
                    <input type="text" name="username"  onChange={this.handleOnChange} />
                    <br />
                    <label htmlFor="password">Password:</label>
                    <input type="password" name="password"  onChange={this.handleOnChange} />
                    <br />
                    < input type="submit" value="Sign Up"/>
                    <a href="/test"> Test</a>
                </form>
                
            </div>
        )
    }
}
export default SignUpForm