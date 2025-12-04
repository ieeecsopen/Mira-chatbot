# test_chat_endpoint.py
"""
Test script for the complete MIRA chat endpoint.
Tests both RAG and conversational modes.
"""
import asyncio
import sys
from api.models import ChatRequest
from api.routers.chat import chat


async def test_chat():
    """Test the chat endpoint with various queries."""
    
    print("=" * 60)
    print("MIRA CHAT ENDPOINT TEST")
    print("=" * 60)
    
    # Test cases
    test_cases = [
        {
            "name": "Sinhala Greeting",
            "user_id": "test_user_1",
            "message": "ආයුබෝවන්! ඔබ කවුද?"
        },
        {
            "name": "Service Hours Query (RAG)",
            "user_id": "test_user_1",
            "message": "ඔබගේ සේවා වේලාව කවරේද?"
        },
        {
            "name": "Follow-up Question",
            "user_id": "test_user_1",
            "message": "සතියේ අන්තිමේ ද සේවා පවත්වනවාද?"
        },
        {
            "name": "General Question",
            "user_id": "test_user_2",
            "message": "ශ්‍රී ලංකාවේ ජනප්‍රිය ආහාර මොනවාද?"
        },
        {
            "name": "English Transliteration",
            "user_id": "test_user_3",
            "message": "kohomada?"
        },
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'=' * 60}")
        print(f"TEST {i}: {test_case['name']}")
        print(f"{'=' * 60}")
        print(f"User ID: {test_case['user_id']}")
        print(f"Message: {test_case['message']}")
        print()
        
        try:
            # Create request
            request = ChatRequest(
                user_id=test_case['user_id'],
                message=test_case['message']
            )
            
            # Call chat endpoint
            response = await chat(request)
            
            # Display response
            print("✅ SUCCESS")
            print(f"\nAnswer:\n{response.answer}")
            print(f"\nRAG Used: {response.rag_used}")
            print(f"Confidence: {response.confidence}")
            
            if response.sources:
                print(f"\nSources ({len(response.sources)}):")
                for source in response.sources:
                    print(f"  - {source}")
            else:
                print("\nSources: None")
                
        except Exception as e:
            print(f"❌ FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
        
        print()
    
    print("=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    # Run async test
    asyncio.run(test_chat())
