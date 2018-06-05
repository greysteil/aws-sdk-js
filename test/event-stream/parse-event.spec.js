var createSpy = require('../helpers').createSpy;
var parseEvent = require('../../lib/event-stream/parse-event').parseEvent;
var testEventMessages = require('./test-event-messages.fixture');
var mockEventStreamShape = require('./test-event-stream-model.fixture').mockEventStreamShape;
var parseMessage = require('../../lib/event-stream/parse-message').parseMessage;
var formatMessage = require('../../lib/event-stream/format-message').formatMessage;
var toBuffer = require('../../lib/event-stream/to-buffer').toBuffer;
var Int64 = require('../../lib/event-stream/int64').Int64;

describe('parseEvent', function() {
    var mockParser = {};

    beforeEach(function() {
        mockParser.parse = createSpy('parse').andReturn('foo');
    });

    it('parses an event into JSON', function() {
        var output = parseEvent(mockParser, testEventMessages.statsEventMessage, mockEventStreamShape);
        var message = formatMessage({
            headers: {},
            body: toBuffer('')
        })

        expect(output).to.eql({
            Stats: {
                Details: 'foo'
            }
        });
    });

    it('will not unmarshall binary events', function() {
        var eventMessage = testEventMessages.recordEventMessage;
        var rawBody = parseMessage(eventMessage).body;

        var output = parseEvent(mockParser, eventMessage, mockEventStreamShape);

        expect(output).to.eql({
            Records: {
                Payload: rawBody
            }
        });
    });

    it('passes the stringified message and the model to the parser', function() {
        var eventMessage = testEventMessages.statsEventMessage;

        var output = parseEvent(mockParser, eventMessage, mockEventStreamShape);

        expect(output).to.eql({
            Stats: {
                Details: 'foo'
            }
        });

        parseCalls = mockParser.parse.calls;
        expect(parseCalls.length).to.equal(1);
        expect(typeof parseCalls[0].arguments[0]).to.equal('string');
        expect(parseCalls[0].arguments[1]).to.equal(
            mockEventStreamShape.members.Stats.members.Details
        );
    });

    it('unmarshalls headers into output', function() {
        var eventMessage = formatMessage({
            headers: {
                ':event-type': {
                    type: 'string',
                    value: 'FooBar'
                },
                HeaderInt: {
                    type: 'integer',
                    value: 3
                },
                HeaderLong: {
                    type: 'long',
                    value: Int64.fromNumber(512)
                },
                HeaderBlob: {
                    type: 'binary',
                    value: toBuffer('call me blob')
                },
                HeaderBoolean: {
                    type: 'boolean',
                    value: true
                },
                HeaderTimestamp: {
                    type: 'timestamp',
                    value: new Date(0)
                },
                HeaderByte: {
                    type: 'byte',
                    value: 90
                },
                HeaderString: {
                    type: 'string',
                    value: 'test'
                }
            },
            body: toBuffer('')
        });

        var output = parseEvent(mockParser, eventMessage, mockEventStreamShape);

        expect(output).to.eql({
            FooBar: {
                Payload: toBuffer(''),
                HeaderInt: 3,
                HeaderLong: 512,
                HeaderBlob: toBuffer('call me blob'),
                HeaderBoolean: true,
                HeaderTimestamp: new Date(0),
                HeaderByte: 90,
                HeaderString: 'test'
            }
        });
    });

    it('unmarshalls error messages', function() {
        var eventMessage = formatMessage({
            headers: {
                ':message-type': {
                    type: 'string',
                    value: 'error'
                },
                ':error-code': {
                    type: 'string',
                    value: 'FooError'
                },
                ':error-message': {
                    type: 'string',
                    value: 'Event Error'
                }
            },
            body: toBuffer('')
        });

        var error = parseEvent(mockParser, eventMessage, mockEventStreamShape);
        expect(error.name).to.equal('FooError');
        expect(error.code).to.equal('FooError');
        expect(error.message).to.equal('Event Error');
    });

});