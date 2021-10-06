
const express = require('express')
const http = require('http')
const path = require('path')
const port = process.env.PORT || 3000
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser,removeUser,getUser,getUserInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))


io.on('connection', (socket) => {
    console.log('New Websocket connection')
    

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage( 'Admin', 'welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })
        callback()
    })
   

    socket.on('message', (message, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

   socket.on('send-location', (position, callback) => {
       const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `http://google.com/maps?q=${position.latitude},${position.longitude}`))
        callback()
   })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage( 'Admin',`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log("Server is up at 3000!")
})