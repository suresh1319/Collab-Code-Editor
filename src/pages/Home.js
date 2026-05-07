import { React, useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomID, setRoomId] = useState(searchParams.get('roomId') || "");
  const [userName, setUserName] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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
      <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <div className="formWrapper">
        <div className="home-logo-text">
          <span className="logo-collab">Collab</span><span className="logo-ce">CE</span>
        </div>
        <h4 className="mainlabel">
            {searchParams.get('roomId') ? '🎉 You were invited! Enter your username to join' : 'Paste Invitation Room Id'}
        </h4>
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
