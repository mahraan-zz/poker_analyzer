$(document).ready(function(){
  "use strict"

  $.get("sample_hand2.xml", function(d){

    $("body").append("<h1> Hand Data </h1>")

    function resetHand(hand) {
      hand.rake = 0
      hand.heroHoleCards = ""
      hand.board = []
      hand.preflop = []
      hand.flop = []
      hand.turn = []
      hand.river = []
      hand.showdown = []
    }

    function addBlinds(xmlElement){

      // add blinds to preflop action list
      xmlElement.find("PlayerAction").each(function(){

        var playerActionElement = $(this)

        // initialize variables
        var id = playerActionElement.attr("seat"),
            smallBlindElement = playerActionElement.find("PostSmallBlind"),
            smallBlindBet = {},
            bigBlindElement = playerActionElement.find("PostBigBlind"),
            bigBlindBet = {}

        // small blind
        if(smallBlindElement.length > 0){
          smallBlindBet[players[id]] = parseFloat(smallBlindElement.attr("amount"))
          hand.preflop.push(smallBlindBet)
        }

        // big blind
        if(bigBlindElement.length > 0){
          bigBlindBet[players[id]] = parseFloat(bigBlindElement.attr("amount"))
          hand.preflop.push(bigBlindBet)
        }

      })
    }

    function recordBetting(xmlElement, street){
      // potential actions
      var checkElement = xmlElement.find("Check"),
          callElement = xmlElement.find("Call"),
          betElement = xmlElement.find("Bet"),
          raiseElement = xmlElement.find("Raise"),
          foldElement = xmlElement.find("Fold"),
          action = {}
      // check
      if(checkElement.length > 0){
        var id = checkElement.parent().attr("seat")
        action[players[id]] = 0
        street.push(action)
      }
      // call
      if(callElement.length > 0){
        var id = callElement.parent().attr("seat")
        action[players[id]] = parseFloat(callElement.attr("amount"))
        street.push(action)
      }
      // bet
      if(betElement.length > 0){
        var id = betElement.parent().attr("seat")
        action[players[id]] = parseFloat(betElement.attr("amount"))
        street.push(action)
      }
      // raise
      if(raiseElement.length > 0){
        var id = raiseElement.parent().attr("seat")
        action[players[id]] = parseFloat(raiseElement.attr("amount"))
        street.push(action)
      }
      // fold
      if(foldElement.length > 0){
        var id = foldElement.parent().attr("seat")
        action[players[id]] = "fold"
        street.push(action)
      }
    }

    function updateStacks(xmlElement){
      xmlElement.find("Pot").each(function(){
        var id = $(this).attr("seat")
        var totalBetThisStreet = parseFloat($(this).attr("change"))
        hand.stacks[players[id]] -= totalBetThisStreet
      })
    }

    function updateRake(xmlElement){
      var rake = 0,
          jackpotFee = 0
      if(xmlElement.find("Rake").length > 0){
        rake = parseFloat(xmlElement.find("Rake").attr("change"))
      }
      if(xmlElement.find("JackpotFee").length > 0){
        jackpotFee = parseFloat(xmlElement.find("JackpotFee").attr("change"))
      }
      hand.rake += rake + jackpotFee
    }

    function updateBoard(xmlElement, dealingElementTagName){
      if(xmlElement.find(dealingElementTagName).length > 0){
        xmlElement.find("Card").each(function(){
          hand.board.push($(this).text())
        })
      }
    }

    function updateWinnerStack(xmlElement){
      if(xmlElement.find("Winner").length > 0){
        var winnerElement = xmlElement.find("Winner"),
            id = winnerElement.attr("seat")
        hand.stacks[players[id]] += parseFloat(winnerElement.attr("amount"))
        handProgress = "endHand" // move state to endHand
      }
    }

    function checkShowdown(xmlElement){

      // showdown happening
      if(xmlElement.find("Show").length > 0 || xmlElement.find("Muck").length > 0){

        xmlElement.find("PlayerAction").each(function(){

          // initialize variables
          var playerActionElement = $(this),
              showdownCards = {}

          // show
          if(playerActionElement.find("Show").length > 0){
            // initialize variables
            var id = playerActionElement.attr("seat"),
                cards = []
            // get shown cards
            xmlElement.find("Card").each(function(){
              cards.push($(this).text())
            })
            // save showdown cards
            showdownCards[players[id]] = cards
            hand.showdown.push(showdownCards)
          }

          // muck
          if(playerActionElement.find("Muck").length > 0){
            // initialize variables
            var id = playerActionElement.attr("seat")
            // save showdown muck action
            showdownCards[players[id]] = "muck"
            hand.showdown.push(showdownCards)
          }
        })
      }
    }

    // declare global variables
    var handProgress = "newHand"
    var players = {}
    var hand = {
      "hero": "",
      "stacks": {}
    }
    resetHand(hand)

    console.log(d)

    // initialize stacks, players, and table meta-data
    $(d).find("TableDetails").each(function(){

      // table meta-data
      hand.game = $(this).attr("game")
      hand.limit = $(this).attr("limit")

      // initialize stacks and players
      $(this).find("Seat").each(function(){
        var seatElement = $(this),
            nickname = seatElement.find("PlayerInfo").attr("nickname")
        players[seatElement.attr("id")] = nickname;
        if(nickname != null){
          hand.stacks[nickname] = parseFloat(seatElement.find("Chips").attr("stack-size"))
        }
      })

      console.log(players)
    })

    // game updates
    $(d).find("Message").each(function(){

       switch (handProgress) {

        // ==[NEW HAND]========================================================
        case "newHand":

          // update game state
          if($(this).find("GameState").length > 0){
            
            $(this).find("Seat").each(function(){
              var seatElement = $(this),
                  nickname = seatElement.find("PlayerInfo").attr("nickname")
              players[seatElement.attr("id")] = nickname;
              if(nickname != null){
                hand.stacks[nickname] = parseFloat(seatElement.find("Chips").attr("stack-size"))
              }
            })

          }

          // initiate new hand and add blinds
          if($(this).find("NewHand").length > 0){
            handProgress = "preflop"
            addBlinds($(this))
          }
          break
        
        // ==[PREFLOP]=========================================================
        case "preflop":

          $(this).find("Changes").each(function(){

            var preflopUpdateElement = $(this)

            // record betting actions
            recordBetting(preflopUpdateElement, hand.preflop) 

            // check if betting is over
            if(preflopUpdateElement.find("PotsChange").length > 0){
              handProgress = "flop" // move state to flop
              updateStacks(preflopUpdateElement) // update stacks based on bets
              updateRake(preflopUpdateElement) // update rake
              
              // print
              console.log("end of preflop")
            }
          })
          break
        
        // ==[FLOP]===========================================================
        case "flop": // look for flop actions
          
          $(this).find("Changes").each(function(){

            var flopUpdateElement = $(this)

            // check for showdown
            checkShowdown(flopUpdateElement)

            // check for winners, and update stack as necessary
            updateWinnerStack(flopUpdateElement)

            // update board
            updateBoard(flopUpdateElement, "DealingFlop")

            // record betting actions
            recordBetting(flopUpdateElement, hand.flop)
            
            // check if betting is over
            if(flopUpdateElement.find("PotsChange").length > 0){
              handProgress = "turn"  // move state to turn
              updateStacks(flopUpdateElement) // update stacks based on bets
              updateRake(flopUpdateElement) // update rake
              
              // print
              console.log("end of flop")

            }
          })
          break

        // ==[TURN]===========================================================
        case "turn": // look for turn actions
          
          $(this).find("Changes").each(function(){

            var turnUpdateElement = $(this)

            // check for showdown
            checkShowdown(turnUpdateElement)

            // check for winners, and update stack as necessary
            updateWinnerStack(turnUpdateElement)

            // update board
            updateBoard(turnUpdateElement, "DealingTurn")

            // record betting actions
            recordBetting(turnUpdateElement, hand.turn)
            
            // check if betting is over
            if(turnUpdateElement.find("PotsChange").length > 0){
              handProgress = "river"  // move state to river
              updateStacks(turnUpdateElement) // update stacks based on bets
              updateRake(turnUpdateElement) // update rake
              
              // print
              console.log("end of turn")

            }
          })
          break
        
        // ==[RIVER]==========================================================
        case "river": // look for river actions
          $(this).find("Changes").each(function(){

            var riverUpdateElement = $(this)

            // check for showdown
            checkShowdown(riverUpdateElement)

            // check for winners, and update stack as necessary
            updateWinnerStack(riverUpdateElement)

            // update board
            updateBoard(riverUpdateElement, "DealingRiver")

            // record betting actions
            recordBetting(riverUpdateElement, hand.river)
            
            // check if betting is over
            if(riverUpdateElement.find("PotsChange").length > 0){
              updateStacks(riverUpdateElement) // update stacks based on bets
              updateRake(riverUpdateElement) // update rake
              
              // print
              console.log("end of river")

            }
          })
          break
        
        case "endHand": // send hand to server

          $(this).find("Changes").each(function(){

            var endHandElement = $(this)

            // check if hand is over
            if(endHandElement.find("EndHand").length > 0){
              // reset hand
              handProgress = "newHand" // move state to newHand
              console.log("end of hand")
              console.log(hand)
              // [TODO] send hand object to server
              // resetHand(hand)
            }

          })

          break

        default:
          console.log("Hand logic broken")
      }
    })
  })

})