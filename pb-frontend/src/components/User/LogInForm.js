import React from 'react'
class LogInForm extends React.Component{
    constructor(){
        super()
        this.state ={
            username: "",
            password: ""
        }
    }

    handleOnChange = e =>{
        this.setState({[e.target["name"]]: e.target.value})
    }
    handleOnSubmit = e => {
        e.preventDefault()
       
        this.props.logIn(this.state)
    
    }
    render(){
  
        return(
            <div className="LogIn">
                <form class="LogInForm" onSubmit={this.handleOnSubmit}> 
                    <label htmlFor="username">Username:</label>
                    <input type="text" name="username" onChange={this.handleOnChange}/>
                    <br />
                    <label htmlFor="password">Password:</label>
                    <input type="password" name="password" onChange={this.handleOnChange}/>
                    <br />
                    < input type="submit" value="Log In"/>
                </form>    
            </div>
        )
    }
}

export default (LogInForm)