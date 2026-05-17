import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import './db'
import trivia from './routes/trivia'

const app = new Hono()
app.use(logger())

app.use('/solve/*', cors())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/solve/trivia', trivia)

export default { 
  port: 3003, 
  fetch: app.fetch, 
} 
