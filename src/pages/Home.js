import { React, useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();
  const [roomID, setRoomId] = useState("");
  const [userName, setUserName] = useState("");

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("Created A New Room");
  };

  const joinRoom = () => {
    if( !roomID || !userName){
        toast.error('Please enter both the fields');
        return;
    }
    //redirect to editor page with roomId and userName in url params
    navigate(`/editor/${roomID}`,{
        state:{
            userName,
        }
    });
  }
   const handleInputEnter=(e)=>{
       if(e.code==='Enter'){
        joinRoom();
       }
    }
  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
        <img className="homePageLogo" src="/logo1.jpg" alt="logo" />
        <h4 className="mainlabel">Paste Invitation Room Id</h4>
        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            value={roomID}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ROOM ID"
            onKeyUp={handleInputEnter}
          />
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="inputBox"
            placeholder="USERNAME"
            onKeyUp={handleInputEnter}
          />
          <button onClick={joinRoom} className="btn joinbtn">Join</button>
          <span className="createInfo">
            Want to create a new room? Click here{" "}
            <a
              href="#"
              onClick={createNewRoom}
              id="create-room"
              className="createNewBtn"
            >
              New Room
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};
export default Home;
