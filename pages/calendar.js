import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {
  Button,
  Flex,
  Image,
  Text,
  Box,
  Center,
  useDisclosure,
} from '@chakra-ui/react';
import LoginModal from '../components/LoginModal';
import SignUpModal from '../components/SignUpModal';
import FriendsDrawer from '../components/FriendsDrawer';
import { useRef, useEffect, useState } from 'react';
import Calendar from '../components/Calendar';
import Notifications from '../components/Notifications';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import { auth, db } from '../firebase/firebaseConfig';
import {
  collection,
  where,
  query,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import InvitedFriends from '../components/InvitedFriends';
import NewEventModal from '../components/NewEventModal';
import EventModal from '../components/EventModal';
import queryDbForFreeTimeEmail from '../methods/queryDbForFreeTimeEmail';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [events, setEvents] = useState([]);
  const btnRef = useRef();
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [eventInfo, setEventInfo] = useState({});
  const [eventDetails, setEventDetails] = useState({
    title: '',
    start: null,
    end: null,
    description: '',
    attendees: [],
    host: {
      displayName: '',
      profilePic: '',
    },
    location: '',
  });
  const [userEmail, setUserEmail] = useState('');
  const [bookedFreeTime, setBookedFreeTime] = useState([]);
  const [freeTimeEmail, setFreeTimeEmail] = useState('');

  const logout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        console.log('signout successful');
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const addNewFriend = (newFriendEmail) => {
    const userDoc = doc(db, 'user_cal_data', userEmail);
    updateDoc(userDoc, {
      friends: arrayUnion(newFriendEmail),
    });
    // console.log('ALL USERS LOOK LIKE THIS', allUsers)
    const newUsers = allUsers.filter((each) => each.email !== newFriendEmail);
    setAllUsers(newUsers);

    const friendsRef = doc(db, 'user_cal_data', newFriendEmail);
    getDoc(friendsRef).then((ref) => {
      const newFriend = ref.data();
      setFriends((prev) => [
        ...prev,
        {
          name: newFriend.displayName,
          email: newFriendEmail.split('@')[0],
          profilePic: newFriend.profilePic,
          fullEmail: newFriendEmail,
          location: newFriend.location,
          freeTimeEmail: newFriend.freeTimeEmail,
          isInvited: false,
        },
      ]);
    });
  };

  const removeFriend = (oldFriendEmail, oldFriendName, oldFriendProfilePic) => {
    const userDoc = doc(db, 'user_cal_data', userEmail);
    updateDoc(userDoc, {
      friends: arrayRemove(oldFriendEmail),
    });
    setFriends((prev) =>
      prev.filter((each) => each.fullEmail !== oldFriendEmail)
    );
    setAllUsers((prev) => [
      ...prev,
      {
        name: oldFriendName,
        email: oldFriendEmail,
        profilePic: oldFriendProfilePic,
      },
    ]);
  };

  const findMutualTime = (email, freeTime) => {
    axios
      .get(`api/freeBusy?email=${email}`)
      .then((response) => {
        const result = response.data.data.calendars[email].busy;
        const freeTimeResult = response.data.data.calendars[freeTime].busy;
        const newResult = [...result, ...freeTimeResult];
        setEvents((prevEvents) => {
          return [
            ...prevEvents,
            ...newResult.map((event) => ({
              ...event,
              title: '~FREE~ 🫡',
              backgroundColor: '#723D46',
              color: 'black',
            })),
          ];
        });
      })
      .then((response) => {
        return axios.get(`api/freeTimeEvents?email=${email}`);
      })
      .then((response) => {
        console.log('RESPONSE', response.data);
        const newResult = response.data;
        setBookedFreeTime((prevEvents) => {
          return [
            ...prevEvents,
            ...newResult.map((event) => ({
              ...event,
              title: '~BOOKED ON FREETIME~ 🫡',
              backgroundColor: 'red',
              color: 'black',
            })),
          ];
        });
      })
      .catch((error) => {
        console.log('could not access events for calendar', error);
      });
  };

  const {
    isOpen: isEventOpen,
    onOpen: onEventOpen,
    onClose: onEventClose,
  } = useDisclosure();

  const {
    isOpen: isDetailsOpen,
    onOpen: onDetailsOpen,
    onClose: onDetailsClose,
  } = useDisclosure();

  useEffect(() => {
    const loadInitialEvents = async (user) => {
      try {
        const newFreeTimeEmail = await queryDbForFreeTimeEmail(user.email);

        if (newFreeTimeEmail.length !== 0) {
          const userDocRef = doc(db, 'user_cal_data', user.email);
          const allUsersRef = collection(db, 'user_cal_data');
          const [
            userDocResponse,
            freeBusyResponse,
            allUsersDocs,
            freeTimeEventsRes,
          ] = await Promise.all(
            [
              getDoc(userDocRef),
              axios.get(`api/freeBusy?email=${user.email}`),
              getDocs(allUsersRef),
              axios.get(`api/freeTimeEvents?email=${user.email}`),
            ].map(async (item) => {
              return await item;
            })
          );

          const userFreeTime =
            freeBusyResponse.data.data.calendars[user.email].busy;
          const freeBusyFreeTime =
            freeBusyResponse.data.data.calendars[newFreeTimeEmail].busy;
          const combinedFreeTime = [...userFreeTime, ...freeBusyFreeTime];

          const userData = userDocResponse.data();
          const currFriends = userData.friends;

          const friends = await Promise.all(
            currFriends.map(async (email) => {
              const docRef = doc(db, 'user_cal_data', email);
              return await getDoc(docRef);
            })
          );

          const friendsData = friends.map((friend, i) => {
            const email = currFriends[i];
            const data = friend.data();
            return {
              name: data.displayName,
              email: email.split('@')[0],
              profilePic: data.profilePic,
              fullEmail: email,
              location: data.location,
              freeTimeEmail: data.freeTimeEmail,
              isInvited: false,
            };
          });

          const allUsers = [];
          allUsersDocs.forEach((doc) => {
            if (user.email !== doc.id && !currFriends.includes(doc.id)) {
              const data = doc.data();
              allUsers.push({
                email: doc.id,
                name: data.displayName || doc.id,
                profilePic: data.profilePic,
              });
            }
          });

          const freeTimeEventsData = freeTimeEventsRes.data;

          const events = combinedFreeTime.map((event) => ({
            ...event,
            title: '~FREE~ 🫡',
            backgroundColor: '#723D46',
            color: 'black',
          }));

          setEvents(events);
          setBookedFreeTime((prevEvents) => {
            return [
              ...prevEvents,
              ...freeTimeEventsData.map((event) => ({
                ...event,
                title: '~BOOKED ON FREETIME~ 🫡',
                backgroundColor: 'red',
                color: 'black',
              })),
            ];
          });
          setUserEmail(user.email);
          setFreeTimeEmail(newFreeTimeEmail);
          setFriends(friendsData);
          setAllUsers(allUsers);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Authenticated');
        loadInitialEvents(user);
      } else {
        router.push('/');
      }
    });
  }, [freeTimeEmail, router]);

  // useEffect(() => {
  //   console.log('FRIEND AND ALLUSERS CHANGE!!!')
  // },[friends, allUsers])

  return (
    <>
      <NewEventModal
        events={events}
        isEventOpen={isEventOpen}
        onEventClose={onEventClose}
        eventInfo={eventInfo}
        friends={friends}
        userEmail={userEmail}
        findMutualTime={findMutualTime}
        freeTimeEmail={freeTimeEmail}
      />
      <EventModal
        events={events}
        isDetailsOpen={isDetailsOpen}
        onDetailsClose={onDetailsClose}
        eventDetails={eventDetails}
        friends={friends}
        userEmail={userEmail}
        findMutualTime={findMutualTime}
        freeTimeEmail={freeTimeEmail}
      />
      <FriendsDrawer
        btnRef={btnRef}
        isOpen={isOpen}
        onClose={onClose}
        friends={friends}
        setFriends={setFriends}
        findMutualTime={findMutualTime}
        allUsers={allUsers}
        addNewFriend={addNewFriend}
        removeFriend={removeFriend}
      />
      <Flex
        bg="#E26D5C"
        justify="space-between"
        gap="1rem"
        w="100%"
        p="0.5rem 2rem"
        alignItems="center"
      >
        <Text as="b" fontSize="3xl" color="#f6f3f3">
          ⌛ Free Time
        </Text>
        <Box>
          <Notifications />
          <Button colorScheme="whiteAlpha" onClick={logout}>
            Log out
          </Button>
        </Box>
      </Flex>
      <Flex justify="center" bg="#f7ecda" paddingBottom="1000px">
        <Box
          p="3rem 3rem 3rem 3rem"
          bg="white"
          w="1200px"
          mt="4rem"
          borderRadius="12px"
          style={{ filter: 'drop-shadow(10px 10px 10px rgba(0,0,0,0.2))' }}
        >
          <Flex gap="1rem" alignItems="center">
            <Button
              ref={btnRef}
              onClick={onOpen}
              mb="1rem"
              bg="#E26D5C"
              color="#f6f3f3"
              style={{ transition: '0.3s' }}
              _hover={{ backgroundColor: '#ba685b', transform: 'scale(1.02)' }}
            >
              Find Friends
            </Button>
            <InvitedFriends friends={friends} />
          </Flex>
          <Box>
            {events.length !== 0 && (
              <Calendar
                events={events}
                friends={friends}
                onEventOpen={onEventOpen}
                eventInfo={eventInfo}
                setEventInfo={setEventInfo}
                eventDetails={eventDetails}
                setEventDetails={setEventDetails}
                bookedFreeTime={bookedFreeTime}
                onDetailsOpen={onDetailsOpen}
              />
            )}
          </Box>
        </Box>
      </Flex>
    </>
  );
}
