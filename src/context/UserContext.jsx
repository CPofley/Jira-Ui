import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (email) => {
    try {
      setLoading(true);
      // Replace with your actual auth token retrieval logic if needed
      const token = localStorage.getItem("token"); 

      const response = await fetch(`http://localhost:8080/api/users/by-email/${email}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data); // Stores { username, email, pictureUrl }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Example trigger: If you save the logged-in user's email somewhere upon OAuth success
  useEffect(() => {
    const loggedInUserEmail = localStorage.getItem("user_email"); 
    if (loggedInUserEmail) {
      fetchUserProfile(loggedInUserEmail);
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, fetchUserProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easy access in components
export const useUser = () => useContext(UserContext);