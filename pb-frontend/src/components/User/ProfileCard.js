import React from 'react'

const ProfileCard =(props)=>{
    const renderIf=()=>{
        let user
    debugger
        if(!!props.currentUser){
      
        user = props.currentUser
        return(<div><h3>{user.name}</h3>
             < img src="https://anthropology.columbia.edu/themes/custom/columbia/assets/img/people-default.svg" alt=""  width="50" height="50"/>
             <h4>@{user.username}</h4>
            </div>)
    
        }else{return (
            <img src="https://media.giphy.com/media/sSgvbe1m3n93G/source.gif"  alt="gif" width="50" height="50" />)}
        
        }
        return(
    
         <div>
              {renderIf()}
         </div>
        )
}
export default ProfileCard