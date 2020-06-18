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
    handleOnChange = e =>{   
        this.setState({[e.target["name"]]: e.target.value})
    }
    handleOnSubmit = e =>{
        e.preventDefault()
        const {name,username,password}=this.state
        let user = {name,username,password}
        this.props.signUp(user)
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