const {getChannel} = require('../services/queue.service')
const {logger} = require('../configs/winston.config')
const CONFIG = require('../configs/global.configs')
const {minted} = require('../controller/token.controller')

getChannel(CONFIG.mintedQueueName, 'dlx-' + CONFIG.mintedQueueName)
    .then(ch => {
        startMintedEventConsumer(ch)
    })
    .catch(e => {
        logger.error(`#Mint Queue Consumer: AMQP connection error: ${e}`)
    })

function startMintedEventConsumer(channel) {
    
    channel.prefetch(1)
    
    channel.consume(CONFIG.mintedQueueName, async function (msg) {
        
        console.log('#Mint Event Message:', msg.content.toString())
        let mintEvent = JSON.parse(msg.content)
        
        const {
            nftAddress,
            tokenId,
            amount,
            owner,
            txHash,
            chainId
        } = mintEvent
        
        try {
            await minted(
                nftAddress,
                tokenId,
                amount,
                owner,
                txHash,
                chainId
            );
        } catch (e) {
            logger.error(
                `#Mint Queue Consumer: Message rejected. ${msg.content.toString()} ${e}`)
            channel.nack(msg, false, false) //false false to send to DLX
            return
        }
        
        channel.ack(msg)
    }, {noAck: false})
}
