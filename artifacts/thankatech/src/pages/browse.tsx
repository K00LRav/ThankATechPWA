import { useState } from "react";
import { Link } from "wouter";
import { useListTechnicians } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Heart, Wrench } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Browse() {
  const [search, setSearch] = useState("");
  const { data: technicians, isLoading } = useListTechnicians({ search: search || undefined });

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Find a Technician</h1>
          <p className="text-lg text-muted-foreground">Discover skilled professionals in your area who have been thanked by their community.</p>
        </div>

        <div className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input 
              placeholder="Search by name or specialty..." 
              className="pl-10 h-12 text-base rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-card animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicians?.map(tech => (
              <Card key={tech.id} className="overflow-hidden hover:shadow-md transition-all group border-primary/5">
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={tech.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {tech.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-serif font-bold text-lg leading-tight group-hover:text-primary transition-colors">{tech.fullName}</h3>
                        <p className="text-sm font-medium text-secondary flex items-center gap-1">
                          <Wrench size={14} />
                          {tech.specialty}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground pt-4 border-t">
                      <p className="flex items-center gap-2">
                        <MapPin size={16} />
                        {tech.serviceArea}
                      </p>
                      <p className="flex items-center gap-2">
                        <Heart size={16} className="text-primary" />
                        <span className="font-medium text-foreground">{tech.totalThanks}</span> Thanks received
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 border-t">
                    <Button asChild className="w-full rounded-full bg-white dark:bg-black" variant="outline">
                      <Link href={`/technician/${tech.id}`}>View Profile</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {technicians?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p className="text-lg">No technicians found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}