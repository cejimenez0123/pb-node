import React from 'react'

class Test extends React.Component{
    constructor(){
        super()
        this.state={apiResponse:""}
    }
    componentDidMount(){
        this.callAPI()
    }
    callAPI(){
        fetch("http://localhost:9000/").then(res =>res.text()).then(
            res=> {
                debugger
                console.log(res)
                this.setState({apiResponse: res})
            }
        )
    }
    render(){
        return( 
            <div>
                TEST class
                <p>{this.state.apiResponse}</p>
            </div>
        )
    }
}
export default Test