import React from "react";
import {useState, useEffect} from "react";
import { fromFetch } from 'rxjs/fetch';
import { switchMap, catchError, mergeMap, takeUntil, finalize, delayWhen, filter, retryWhen, tap, flatMap} from 'rxjs/operators';
import { of, fromEvent, timer, forkJoin, zip } from 'rxjs';
import Header from "./Header";

function Buy () {

const auth = btoa('admin:admin');
var QRCode = require('qrcode.react');
const [tickets, setTickets] = useState([]);
const [pcs, setPcs] = useState("");
const [orderid, setOrderid] = useState("");
const [events, setEvents] = useState([]);
const [selectedEvent, setSelectedEvent] = useState('');
const [selectedType, setSelectedType] = useState('');
const [sold, setSold] = useState([]);
const [sum, setSum] =useState(0);
const [errormessage, setErrormessage] = useState('');
const [types, setTypes] = useState([]);

useEffect(() => {
    onClickNewOrder();
    fetchTickettypesAndEvents();
}, []);

const GET = {
            method : 'get',
            mode: 'cors',
            cache : 'no-cache',
            credentials : 'same-origin',
            headers : {
                'Accept': 'application/json',
                'Content-Type' : 'application/json',
                'Authorization' : 'Basic ' + auth,
}};  
 
function fetchTickettypesAndEvents() {
        const data = forkJoin({
            events: getEvents,
            types: getTicketTypes
        });

        data.subscribe({
            next: value => {
                setEvents(value.events);
                setTypes(value.types._embedded.ticketTypes);
            }
        });
    }

            
//FETCH EVENTS

const getEvents = 
    fromFetch("https://ticketguru.herokuapp.com/api/events/upcoming", GET)
    .pipe(
        switchMap(response => {
          if (response.ok) {
            return response.json();
          } else {
            return of({ error: true, message: `Error ${response.status}` });
          }
        }),
        catchError(err => {
          console.error(err);
          return of({ error: true, message: err.message })
        })
       );

/*
const getEvents = 
    fromFetch("https://ticketguru.herokuapp.com/api/events/upcoming", GET)
    .pipe(
        switchMap(response => {
          if (response.ok) {
            return response.json();
          } else {
            return of({ error: true, message: `Error ${response.status}` });
          }
        }),
        catchError(err => {
          console.error(err);
          return of({ error: true, message: err.message })
        })
       );

*/
//FETCH TICKETTYPES
const getTicketTypes =  
        fromFetch("https://ticketguru.herokuapp.com/autoapi/ticketTypes/", GET)
        .pipe(
            switchMap(response => {
              if (response.ok) {
                return response.json();
              } else {
                return of({ error: true, message: `Error ${response.status}` });
              }
            }),
            catchError(err => {
              console.error(err);
              return of({ error: true, message: err.message })
            })
           );            

 //NEW ORDER   
 const onClickNewOrder = () => {
        const click = fromEvent(document.getElementById("clickNewOrder"), "click")
                        .subscribe(newOrder);
 }    

const newOrder = () => {
    const POST = {
        method : 'post',
        mode: 'cors',
        cache : 'no-cache',
        credentials : 'same-origin',
        headers : {
            'Accept': 'application/json',
            'Content-Type' : 'application/json',
            'Authorization' : 'Basic ' + auth,
        },
        body : JSON.stringify({})
    }

    fromFetch("https://ticketguru.herokuapp.com/api/orders/", POST)
    .subscribe(
    response => response.json().then(data => setOrderid(data.orderid)),
    error => setErrormessage("Tilauksen teko ei onnistunut")
);
}   

//BUY TICKETS
const buyTickets = (evt) => {

    setErrormessage('')

    let order  = JSON.stringify(orderid);

    const POST = {
        method : 'post',
        mode: 'cors',
        cache : 'no-cache',
        credentials : 'same-origin',
        headers : {
            'Accept': 'application/json',
            'Content-Type' : 'application/json',
            'Authorization' : 'Basic ' + auth,
        },
        body : JSON.stringify({        
           pcs: pcs,
           orderid: order,
           tickettypeid: selectedType,
    
         })                 
        };

        fromFetch("https://ticketguru.herokuapp.com/api/events/"+  selectedEvent+"/tickets", POST)
        .pipe(
            switchMap(response => {
            if (response.ok) {
              return response.json();
            } else {
              return of({ error: true, message: `Error ${response.status}` });
            }
          }),
          catchError(err => {
            console.error(err);
            return of({ error: true, message: err.message })
          }),
          finalize(() => getTotalSum())
        )
        .subscribe({
            next: result => setResults(result)
        });
}

function setResults(response){
    if (response.error == true) {
        setErrormessage('Lipun osto ei onnistunut: ' + response.message)
        return;
    }
    else {
        setTickets(response)
    }
}

//PRINT TICKETS
const printTickets = () => {

    if (orderid == null || orderid == "") {
        setErrormessage("Ei käsittelyssä olevaa tilausta tai tilaus ei sisällä lippuja")
        return;
    }

    setErrormessage('')

    const fetched_tickets = fromFetch("https://ticketguru.herokuapp.com/api/orders/" +orderid+ "/tickets", GET).pipe(
        switchMap(response => {
            if(response.ok){
                return response.json();
            }
            else {
                return of({ error: true, message: `Error ${response.status}` });
            }
        }),
        catchError(err => {
            console.error(err);
            return of({ error: true, message: err.message })
          })
         );

        fetched_tickets.subscribe({
        next: result => setTicketsToPrint(result)
        });
}

function setTicketsToPrint(response){
    if (response.error == true) {
        setErrormessage('Tulostus ei onnistu : ' + response.message)
        return;
    }
    else {
        setSold(response)
    }
}

//FETCH TOTALSUM 
const getTotalSum = () => {
    fromFetch("https://ticketguru.herokuapp.com/autoapi/orders/" + orderid, GET)
    .subscribe(
        response => response.json().then(data => setSum(data.total)),
        error => {
            setErrormessage("Summan haku ei onnistunut: " + error)
        })
    }





    return (
    <div>
    <Header/>   
        
    <div className ="main">
 

    <div className="formi">

        <div className="form-group">
            <button type="button" className="btn btn-secondary btn-lg btn-block" id="clickNewOrder" >Uusi tilaus</button>    
        </div> 

        <div className="form-group">   
            <p>Käsittelyssä oleva tilaus: {orderid}  (luo uusi jos tyhjä) </p>
        </div>
        
        <form>
        <div className="form-group">   
            <input className="form-control" type="number" placeholder="Lippujen lkm" value={pcs} id="example-number-input" onChange={ pcs => setPcs(pcs.currentTarget.value) }></input>    
        </div> 


        <div className="form-group">  
          <select className="form-control" id="exampleFormControlSelect1" value={selectedEvent} 
          onChange={selectedEvent => setSelectedEvent(selectedEvent.currentTarget.value)}>
            <option value="0">Valitse tapahtuma</option>   
            {events.map(item => (
                <option
                key={item.eventid}
                value={item.eventid} 
                >
                {item.name} {item.startTime}
                </option>
            ))}
         </select>
         </div>

        <div className="form-group">  
          <select className="form-control" id="exampleFormControlSelect1"  value={selectedType} 
          onChange={(selectedType) => setSelectedType(selectedType.currentTarget.value)}>
          <option value="0">Valitse lipputyyppi</option>   
            {types.map(item => (
                <option
                key={item.ticketypeid}
                value={item.ticketypeid} 
                >
                {item.type} 
                </option>
            ))}
          </select>
          <p> {errormessage}  </p>
          </div>

        <div className="form-group">
            <button type="button" className="btn btn-secondary btn-lg btn-block" onClick={buyTickets} id="onClickBuyTickets">Osta liput</button>    
        </div> 

        <div className="form-group">
            <button type="button" className="btn btn-secondary btn-lg btn-block" onClick={printTickets}>Tulosta tilauksen liput</button>    
        </div>         

    </form>
    </div>

    <div className="half">
        <table className="table table-dark table-striped table-borderless text-left border border-dark">
            <thead>
            <tr>
                <th>Tapahtuma</th>
                <th>Hinta</th> 
                <th>Koodi</th>
            </tr>
            </thead>

            <tbody>
            {tickets.map(ticket => (
            <tr key ={ticket.ticketid}>
                <td> {ticket.event.name} </td>   
                <td> {ticket.price} </td>  
                <td> {ticket.ticketcode} </td>
            </tr>    
            ))}
            </tbody>
		 </table>

         <div className="form-group">   
            <p>Summa yhteensä: {sum}  </p>
        </div>

     </div>       
    </div>

    <div className="print">
        <table className="table table-dark table-striped table-borderless text-left border border-dark">
            <thead>
            <tr>
                <th>Tapahtuma</th>
                <th>Hinta</th> 
                <th>Koodi</th>
                <th>QR</th>
            </tr>
            </thead>

            <tbody>
            {sold.map(ticket => (
            <tr key ={ticket.ticketid}>
                <td> {ticket.event.name} </td>   
                <td> {ticket.price} </td>  
                <td> {ticket.ticketcode} </td>
              
                          
                    <QRCode
                        value={ticket.ticketcode}
                        size={290}
                        level={"H"}
                        includeMargin={true}
                    />
            </tr>    
            ))}
         
            </tbody>
		 </table>
     </div>
    
    </div>
          );
        };
 

export default Buy;
