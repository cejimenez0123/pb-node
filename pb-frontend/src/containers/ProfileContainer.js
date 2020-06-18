import React from 'react'
import ProfileCard from "../components/User/ProfileCard"
import Navbar from "../components/Navbar"
class ProfileContainer extends React.Component{
    render(){
        return(<div>
            <Navbar/>
            <ProfileCard currentUser={this.props.currentUser}/>
            Profile Container
        </div>)
    }
}
export default ProfileContainer